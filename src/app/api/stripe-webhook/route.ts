import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";

function initAdmin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      }),
    });
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-07-30.basil",
});

function tsFromSeconds(s?: number | null) {
  if (!s) return null;
  return Timestamp.fromMillis(s * 1000);
}

async function markIdempotent(db: FirebaseFirestore.Firestore, eventId: string) {
  const ref = db.collection("stripe_events").doc(eventId);
  const snap = await ref.get();
  if (snap.exists) return false;
  await ref.set({ processedAt: FieldValue.serverTimestamp() });
  return true;
}

async function findUserByCustomerId(db: FirebaseFirestore.Firestore, customerId: string) {
  const q = await db.collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  if (q.empty) return null;
  const doc = q.docs[0];
  return { ref: doc.ref, data: doc.data() };
}

export async function POST(req: NextRequest) {
  try {
    initAdmin();
    const db = getFirestore();

    const sig = req.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

    const payload = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );
    } catch (err: any) {
      console.error("Webhook signature verify failed:", err?.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const fresh = await markIdempotent(db, event.id);
    if (!fresh) return NextResponse.json({ ok: true, dedup: true });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = (session.metadata?.uid as string) || "";
        const couponCode = (session.metadata?.couponCode as string) || "";
        const customerId = (session.customer as string) || undefined;
        const subscriptionId = (session.subscription as string) || undefined;

        if (uid && customerId) {
          const userRef = db.collection("users").doc(uid);
          await userRef.set(
            {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId || null,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }

        if (couponCode) {
          const cRef = db.collection("coupons").doc(couponCode);
          await db.runTransaction(async (tx) => {
            const snap = await tx.get(cRef);
            if (!snap.exists) return;
            const c = snap.data() || {};
            if (c.active === false) return;
            tx.update(cRef, { redeemedCount: FieldValue.increment(1) });
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        // Tipagem defensiva
        const currentPeriodEndSec: number | undefined = (sub as any).current_period_end;
        const trialEndSec: number | undefined = (sub as any).trial_end;
        const customerId = sub.customer as string;

        const u = await findUserByCustomerId(db, customerId);
        if (!u) break;

        const status = sub.status as
          | "active"
          | "trialing"
          | "past_due"
          | "canceled"
          | "unpaid"
          | "incomplete"
          | "incomplete_expired"
          | "paused";

        let mapped: "active" | "trialing" | "past_due" | "canceled" = "active";
        if (status === "trialing") mapped = "trialing";
        else if (status === "past_due" || status === "unpaid" || status === "paused") mapped = "past_due";
        else if (status === "canceled" || status === "incomplete" || status === "incomplete_expired") mapped = "canceled";
        else mapped = "active";

        await u.ref.set(
          {
            subscriptionStatus: mapped,
            currentPeriodEnd: tsFromSeconds(currentPeriodEndSec),
            trialEndAt: tsFromSeconds(trialEndSec ?? undefined),
            stripeSubscriptionId: sub.id,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        break;
      }

      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = inv.customer as string;
        const u = await findUserByCustomerId(db, customerId);
        if (!u) break;

        const line = inv.lines?.data?.[0];
        const endSec: number | undefined =
          (line?.period?.end as number | undefined) ?? (inv as any).period_end;

        await u.ref.set(
          {
            subscriptionStatus: "active",
            currentPeriodEnd: tsFromSeconds(endSec),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = inv.customer as string;
        const u = await findUserByCustomerId(db, customerId);
        if (!u) break;

        await u.ref.set(
          {
            subscriptionStatus: "past_due",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        break;
      }

      default:
        // outros eventos: ignorar
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("stripe-webhook error:", e);
    return NextResponse.json({ error: e?.message || "Webhook failure" }, { status: 500 });
  }
}
