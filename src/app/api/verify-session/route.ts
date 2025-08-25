// src/app/api/verify-session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "missing session_id" }, { status: 400 });
    }

    // pega sessão + assinatura
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer", "total_details.breakdown.discounts"],
    });

    const userId = session.metadata?.userId;
    if (!userId) {
      return NextResponse.json({ error: "missing userId in metadata" }, { status: 400 });
    }

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id || null;

    const sub =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

    const status = sub?.status || "incomplete";
    const active = ["active", "trialing"].includes(status);

    const emailFromSession =
      session.customer_details?.email || session.customer_email || null;

    const uref = doc(db, "users", userId);
    const usnap = await getDoc(uref);
    if (!usnap.exists()) {
      await setDoc(uref, {
        createdAt: serverTimestamp(),
      });
    }

    await updateDoc(uref, {
      email: emailFromSession,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub?.id || null,
      subscriptionStatus: status,
      assinaturaAtiva: active,
      plan: session.metadata?.plan || null,
      couponCode: session.metadata?.couponCode || null,
      updatedAt: serverTimestamp(),
    });

    // incrementa uso do cupom (se existir)
    if (session.metadata?.couponCode) {
      const cref = doc(db, "coupons", session.metadata.couponCode);
      await updateDoc(cref, { redeemedCount: increment(1) });
    }

    return NextResponse.json({ ok: true, active, status });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 400 });
  }
}
