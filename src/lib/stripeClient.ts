// Cliente de conveniência para chamar os endpoints Stripe com Bearer <idToken>
import { getIdTokenOrThrow } from "@/lib/auth/getIdToken";

export async function startCheckout(plan: "mensal" | "anual", couponCode?: string) {
  const idToken = await getIdTokenOrThrow();
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ plan, couponCode: couponCode ?? null }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || "Falha ao iniciar checkout.");
  }
  const { url, redirect, message } = await res.json();
  if (url) window.location.href = url;
  else if (redirect) {
    if (message) alert(message);
    window.location.href = redirect;
  }
}

export async function openBillingPortal() {
  const idToken = await getIdTokenOrThrow();
  const res = await fetch("/api/stripe/create-portal", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || "Não foi possível abrir o portal.");
  }
  const { url } = await res.json();
  window.location.href = url;
}
