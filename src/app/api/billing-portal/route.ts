import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { uid, returnUrl } = await req.json();

    const snap = await getDoc(doc(db, "users", uid));
    const customerId = snap.data()?.stripeCustomerId;
    if (!customerId) throw new Error("stripeCustomerId não encontrado");

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url:
        returnUrl ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000/app/perfil",
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
