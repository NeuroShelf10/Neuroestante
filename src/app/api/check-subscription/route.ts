// src/app/api/check-subscription/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { uid, email } = await req.json();

    if (!uid || !email) {
      throw new Error("uid e email são obrigatórios.");
    }

    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    // Garante doc mínimo
    if (!snap.exists()) {
      await setDoc(userRef, {
        email,
        assinaturaAtiva: false,
        createdAt: new Date().toISOString(),
      });
    }

    let data = (await getDoc(userRef)).data() || {};
    let customerId: string | undefined = data.stripeCustomerId;

    // Se não tiver customerId salvo, tenta achar pelo e-mail no Stripe
    if (!customerId) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        await updateDoc(userRef, { stripeCustomerId: customerId });
      }
    }

    let active = false;

    if (customerId) {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
      });

      // Considera ativo se estiver "active" ou "trialing"
      active = subs.data.some((s) =>
        ["active", "trialing"].includes(s.status)
      );
    }

    await updateDoc(userRef, { assinaturaAtiva: active });

    return NextResponse.json({ active });
  } catch (err: any) {
    console.error("CHECK_SUBSCRIPTION_ERROR:", err?.message || err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 400 });
  }
}
