import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { initAdmin } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-07-30.basil",
});

function extractBearer(req: NextRequest): string | null {
  const h = req.headers.get("Authorization") || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  return null;
}

export async function POST(req: NextRequest) {
  try {
    initAdmin();
    const idToken = extractBearer(req);
    if (!idToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const db = getFirestore();
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    const data = snap.data() || {};
    const customerId = data.stripeCustomerId as string | undefined;
    if (!customerId) {
      return NextResponse.json(
        { error: "Cliente Stripe não vinculado. Faça um checkout primeiro." },
        { status: 400 }
      );
    }

    const returnUrl =
      process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/assinatura`
        : "http://localhost:3000/assinatura";

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("create-portal error:", e);
    return NextResponse.json({ error: e?.message || "Erro ao abrir portal" }, { status: 500 });
  }
}
