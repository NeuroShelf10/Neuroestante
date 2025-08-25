"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

type Plan = "monthly" | "yearly";
type CouponInfo = {
  code: string;
  valid: boolean;
  message?: string;
  trialDays?: number;
  restrictTo?: Plan | null;
  promotionCodeId?: string | null;
  lockedPlan?: boolean;
  lifetime?: boolean;
  requireCard?: boolean; // trial sem cartão
};

export default function CadastroPage() {
  const router = useRouter();
  const search = useSearchParams();
  const presetPlan = (search.get("plan") as Plan) || "monthly";

  const [nome, setNome] = useState("");
  const [crp, setCrp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [plan, setPlan] = useState<Plan>(presetPlan);
  const [planLocked, setPlanLocked] = useState(false);

  const [cupom, setCupom] = useState("");
  const [couponInfo, setCouponInfo] = useState<CouponInfo | null>(null);

  const [message, setMessage] = useState("");
  const [uid, setUid] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  async function validarCupom() {
    setChecking(true);
    setMessage("");
    setCouponInfo(null);
    try {
      const code = cupom.trim().toUpperCase();
      if (!code) {
        setCouponInfo({ code, valid: false, message: "Informe um cupom." });
        return;
      }

      const snap = await getDoc(doc(db, "coupons", code));
      if (!snap.exists()) {
        setCouponInfo({ code, valid: false, message: "Cupom não encontrado." });
        return;
      }
      const c: any = snap.data();

      if (!c.active) {
        setCouponInfo({ code, valid: false, message: "Cupom inativo." });
        return;
      }
      if (
        typeof c.maxRedemptions === "number" &&
        typeof c.redeemedCount === "number" &&
        c.redeemedCount >= c.maxRedemptions
      ) {
        setCouponInfo({
          code,
          valid: false,
          message: "Este cupom atingiu o limite de uso.",
        });
        return;
      }

      // travar plano se houver restrictTo
      let locked = false;
      if (
        c.restrictTo &&
        (c.restrictTo === "monthly" || c.restrictTo === "yearly")
      ) {
        locked = true;
        setPlan(c.restrictTo);
        setPlanLocked(true);
      } else {
        setPlanLocked(false);
      }

      // vitalício
      if (c.lifetime === true) {
        setCouponInfo({
          code,
          valid: true,
          lifetime: true,
          message: "Cupom vitalício • acesso permanente",
          restrictTo: c.restrictTo ?? null,
          promotionCodeId: c.stripePromotionCodeId ?? null,
          lockedPlan: locked,
          requireCard: true,
        });
        return;
      }

      // demais (trial, com/sem cartão)
      setCouponInfo({
        code,
        valid: true,
        lifetime: false,
        message:
          (c.trialDays
            ? `Cupom válido • ${c.trialDays} dia(s) grátis`
            : "Cupom válido") +
          (c.restrictTo
            ? ` • Plano ${c.restrictTo === "yearly" ? "anual" : "mensal"}`
            : "") +
          (c.requireCard === false ? " • sem cartão" : ""),
        trialDays: typeof c.trialDays === "number" ? c.trialDays : undefined,
        restrictTo: c.restrictTo ?? null,
        promotionCodeId: c.stripePromotionCodeId ?? null,
        lockedPlan: locked,
        requireCard: c.requireCard !== false ? true : false, // default = true
      });
    } catch (err: any) {
      console.error(err);
      setCouponInfo({
        code: cupom,
        valid: false,
        message: "Erro ao validar cupom.",
      });
    } finally {
      setChecking(false);
    }
  }

  function limparCupom() {
    setCouponInfo(null);
    setCupom("");
    setPlanLocked(false);
  }

  const planBtn = (p: Plan, label: string) => (
    <button
      type="button"
      onClick={() => !planLocked && setPlan(p)}
      disabled={planLocked}
      className={[
        "rounded-lg border py-2",
        plan === p ? "border-violet-600 bg-violet-50" : "bg-white",
        planLocked ? "opacity-60 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {label}
    </button>
  );

  const handleCadastroEPagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      let userId = uid;

      // 1) cria usuário + doc
      if (!userId) {
        if (!email || !password) throw new Error("Informe e-mail e senha.");
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        userId = cred.user.uid;

        await setDoc(
          doc(db, "users", userId),
          {
            nome,
            crp,
            email,
            consentAccepted: false, // termo será exigido ao entrar no app
            subscriptionStatus: "pending",
            planPreference: plan,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setUid(userId);
      } else {
        await setDoc(
          doc(db, "users", userId),
          {
            nome,
            crp,
            email,
            planPreference: plan,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      // 2) CUPONS QUE PULAM STRIPE
      if (couponInfo?.valid) {
        // 2a) Vitalício
        if (couponInfo.lifetime) {
          await updateDoc(doc(db, "users", userId!), {
            subscriptionStatus: "lifetime",
            currentPeriodEnd: null,
            trialEndAt: null,
            updatedAt: serverTimestamp(),
          });
          await updateDoc(doc(db, "coupons", couponInfo.code), {
            redeemedCount: increment(1),
          });
          router.replace("/login");
          return;
        }

        // 2b) Trial sem cartão → concede trial local
        if (couponInfo.requireCard === false && (couponInfo.trialDays ?? 0) > 0) {
          const ms =
            (couponInfo.trialDays as number) * 24 * 60 * 60 * 1000;
          await updateDoc(doc(db, "users", userId!), {
            subscriptionStatus: "trialing",
            trialEndAt: Date.now() + ms,
            currentPeriodEnd: null,
            updatedAt: serverTimestamp(),
          });
          await updateDoc(doc(db, "coupons", couponInfo.code), {
            redeemedCount: increment(1),
          });
          router.replace("/login");
          return;
        }
        // se requireCard=true, segue pro Stripe (com trial aplicado lá)
      }

      // 3) Abre STRIPE
      const stripe = await stripePromise;
      if (!stripe)
        throw new Error(
          "Stripe não carregou. Verifique NEXT_PUBLIC_STRIPE_PUBLIC_KEY."
        );

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          plan,
          coupon: couponInfo?.valid
            ? {
                code: couponInfo.code,
                promotionCodeId: couponInfo.promotionCodeId,
                trialDays: couponInfo.trialDays,
                lifetime: false,
              }
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao criar checkout.");
      if (!data?.url) throw new Error("Resposta sem URL do checkout.");

      window.location.href = data.url;
    } catch (err: any) {
      setMessage("❌ " + (err.message || String(err)));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-md">
        <h1 className="mb-4 text-center text-xl font-bold">Cadastro</h1>

        <form onSubmit={handleCadastroEPagamento} className="space-y-3">
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="CRP"
            value={crp}
            onChange={(e) => setCrp(e.target.value)}
          />
          <input
            className="w-full rounded-lg border px-3 py-2"
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-lg border px-3 py-2"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Plano */}
          <div className="mt-1 grid grid-cols-2 gap-2">
            {planBtn("monthly", "Mensal")}
            {planBtn("yearly", "Anual")}
          </div>

          {/* Cupom */}
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border px-3 py-2"
              placeholder="Cupom (opcional)"
              value={cupom}
              onChange={(e) => setCupom(e.target.value)}
              disabled={planLocked && !!couponInfo}
            />
            {couponInfo ? (
              <button
                type="button"
                onClick={limparCupom}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Remover
              </button>
            ) : (
              <button
                type="button"
                onClick={validarCupom}
                disabled={checking || !cupom.trim()}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                {checking ? "Validando…" : "Validar"}
              </button>
            )}
          </div>

          {/* Feedback do cupom */}
          {couponInfo && (
            <div
              className={
                "text-sm rounded-lg px-3 py-2 " +
                (couponInfo.valid
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200")
              }
            >
              {couponInfo.message}
              {couponInfo.valid && couponInfo.lockedPlan && (
                <span className="ml-1 opacity-75">(plano travado pelo cupom)</span>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-violet-600 py-2 text-white hover:bg-violet-700"
          >
            Concluir e ir ao pagamento
          </button>
        </form>

        {message && (
          <p className="mt-3 text-center text-red-500">{message}</p>
        )}
      </div>
    </div>
  );
}
