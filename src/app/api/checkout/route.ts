import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  Firestore,
} from "firebase-admin/firestore";

/** ---------- Tipos ---------- */
type Body = {
  plan?: "mensal" | "anual";
  couponCode?: string | null;
};

type CouponDoc = {
  active?: boolean;
  lifetime?: boolean;
  trialDays?: number;
  requireCard?: boolean;
  restrictTo?: string | string[];
  maxRedemptions?: number;
  redeemedCount?: number;
};

type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "lifetime";

type UserDoc = {
  email?: string;
  name?: string;
  stripeCustomerId?: string;
  subscriptionStatus?: SubscriptionStatus;
  trialEndAt?: Timestamp | null;
  currentPeriodEnd?: Timestamp | null;
  acceptedTermsAt?: Timestamp | null;
  updatedAt?: FirebaseFirestore.FieldValue | Timestamp | null;
};

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

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// Padronizado com o pacote instalado
const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-07-30.basil",
});

export async function POST(req: NextRequest) {
  try {
    initAdmin();
    const db = getFirestore();

    const idToken = extractBearer(req);
    if (!idToken) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const decoded = await getAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const body = (await req.json()) as Body;
    const plan = body.plan === "anual" ? "anual" : "mensal";
    const couponCode = sanitizeCode(body.couponCode);

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Carrega usuário
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }
    const user = (userSnap.data() || {}) as UserDoc;

    // Cupom (se houver)
    let coupon: (CouponDoc & { id: string }) | null = null;
    if (couponCode) {
      const cRef = db.collection("coupons").doc(couponCode);
      const cSnap = await cRef.get();
      if (!cSnap.exists) {
        return NextResponse.json({ error: "Cupom inválido." }, { status: 400 });
      }
      const c = (cSnap.data() || {}) as CouponDoc;
      if (!c.active) {
        return NextResponse.json({ error: "Cupom inativo." }, { status: 400 });
      }
      if (
        typeof c.maxRedemptions === "number" &&
        typeof c.redeemedCount === "number" &&
        c.redeemedCount >= c.maxRedemptions
      ) {
        return NextResponse.json({ error: "Cupom esgotado." }, { status: 400 });
      }
      coupon = { ...c, id: cSnap.id };
      // (Opcional) validar restrictTo (email/CRP) aqui.
    }

    // 1) Vitalício → sem Stripe
    if (coupon?.lifetime) {
      await redeemCouponTransaction(db, coupon.id);
      await userRef.update({
        subscriptionStatus: "lifetime",
        trialEndAt: null,
        currentPeriodEnd: null,
        updatedAt: FieldValue.serverTimestamp(),
        lastCouponCode: coupon.id,
      } as Partial<UserDoc> & Record<string, unknown>);

      return NextResponse.json({
        mode: "lifetime",
        redirect: `${APP_URL}/login`,
        message: "Acesso vitalício aplicado. Faça login para continuar.",
      });
    }

    // 2) Teste sem cartão → sem Stripe
    if (coupon?.trialDays && coupon.requireCard === false) {
      const trialEnd = Timestamp.fromDate(
        new Date(Date.now() + coupon.trialDays * 24 * 60 * 60 * 1000)
      );
      await redeemCouponTransaction(db, coupon.id);
      await userRef.update({
        subscriptionStatus: "trialing",
        trialEndAt: trialEnd,
        currentPeriodEnd: null,
        updatedAt: FieldValue.serverTimestamp(),
        lastCouponCode: coupon.id,
      } as Partial<UserDoc> & Record<string, unknown>);

      return NextResponse.json({
        mode: "trial_no_card",
        redirect: `${APP_URL}/login`,
        message: `Período de teste iniciado (${coupon.trialDays} dias). Faça login para continuar.`,
      });
    }

    // 3) Checkout Stripe (sem cupom ou cupom que exige cartão)
    const priceId =
      plan === "anual" ? requiredEnv("STRIPE_PRICE_ID_ANUAL") : requiredEnv("STRIPE_PRICE_ID_MENSAL");

    const customerId = await ensureStripeCustomer(stripe, db, userRef, user, uid);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      success_url: `${APP_URL}/login?paid=1`,
      cancel_url: `${APP_URL}/cadastro?canceled=1`,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: false,
      subscription_data: {
        trial_period_days:
          coupon?.trialDays && coupon.requireCard !== false ? coupon.trialDays : undefined,
        metadata: { uid, couponCode: coupon?.id || "", plan },
      },
      metadata: { uid, couponCode: coupon?.id || "", plan },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("checkout error:", e);
    return NextResponse.json(
      { error: e?.message || "Erro ao iniciar checkout." },
      { status: 500 }
    );
  }
}

/* -------------------- helpers -------------------- */

function extractBearer(req: NextRequest): string | null {
  const h = req.headers.get("Authorization") || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  return null;
}

function sanitizeCode(code?: string | null): string | null {
  if (!code) return null;
  return String(code).trim().toUpperCase();
}

async function redeemCouponTransaction(db: Firestore, code: string) {
  const cRef = db.collection("coupons").doc(code);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(cRef);
    if (!snap.exists) throw new Error("Cupom não encontrado.");
    const c = (snap.data() || {}) as CouponDoc;
    if (!c.active) throw new Error("Cupom inativo.");

    if (typeof c.maxRedemptions === "number") {
      const next = (c.redeemedCount || 0) + 1;
      if (next > c.maxRedemptions) throw new Error("Cupom esgotado.");
      tx.update(cRef, { redeemedCount: next });
    } else {
      tx.update(cRef, { redeemedCount: FieldValue.increment(1) });
    }
  });
}

async function ensureStripeCustomer(
  stripe: Stripe,
  db: Firestore,
  userRef: FirebaseFirestore.DocumentReference,
  user: UserDoc,
  uid: string
): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const authUser = await getAuth().getUser(uid).catch(() => null);
  const email = user.email || authUser?.email || undefined;
  const name = user.name || authUser?.displayName || undefined;

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { uid },
  });

  await userRef.update({
    stripeCustomerId: customer.id,
    updatedAt: FieldValue.serverTimestamp(),
  } as Partial<UserDoc> & Record<string, unknown>);

  return customer.id;
}
