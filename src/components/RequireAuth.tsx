"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  onSnapshot,
  Timestamp,
  DocumentData,
} from "firebase/firestore";
import { app as firebaseApp } from "@/lib/firebase";

type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "lifetime"
  | undefined;

type UserDoc = {
  acceptedTermsAt?: Timestamp | null;
  subscriptionStatus?: SubscriptionStatus;
  trialEndAt?: Timestamp | null;
  currentPeriodEnd?: Timestamp | null;
};

function tsToMillis(t?: Timestamp | null) {
  if (!t) return undefined;
  try {
    return t.toMillis();
  } catch {
    return undefined;
  }
}

function hasActiveAccess(u?: UserDoc): boolean {
  const status = u?.subscriptionStatus;
  const now = Date.now();

  if (status === "lifetime") return true;

  const currentPeriodEnd = tsToMillis(u?.currentPeriodEnd);
  const trialEndAt = tsToMillis(u?.trialEndAt);

  if (status === "active" && currentPeriodEnd && now < currentPeriodEnd) return true;
  if (status === "trialing" && trialEndAt && now < trialEndAt) return true;

  return false;
}

export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const search = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  const auth = useMemo(() => getAuth(firebaseApp), []);
  const db = useMemo(() => getFirestore(firebaseApp), []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setUid(user.uid);

      const ref = doc(db, "users", user.uid);
      const unsubDoc = onSnapshot(
        ref,
        (snap) => {
          const data = (snap.data() as DocumentData) || {};
          const u: UserDoc = {
            acceptedTermsAt: data.acceptedTermsAt ?? null,
            subscriptionStatus: data.subscriptionStatus as SubscriptionStatus,
            trialEndAt: data.trialEndAt ?? null,
            currentPeriodEnd: data.currentPeriodEnd ?? null,
          };

          // 1) termo
          if (!u.acceptedTermsAt && window.location.pathname !== "/consentimento") {
            setLoading(false);
            router.replace("/consentimento");
            return;
          }

          // 2) assinatura
          if (u.acceptedTermsAt && !hasActiveAccess(u) && window.location.pathname !== "/assinatura") {
            setLoading(false);
            router.replace("/assinatura");
            return;
          }

          // 3) tudo ok → se estiver no login/consentimento, manda para /app
          const path = window.location.pathname;
          if (u.acceptedTermsAt && hasActiveAccess(u) && (path === "/" || path === "/login" || path === "/consentimento")) {
            setLoading(false);
            router.replace("/app");
            return;
          }

          setLoading(false);
        },
        () => {
          setLoading(false);
          router.replace("/login");
        }
      );

      return () => unsubDoc();
    });

    return () => unsubAuth();
  }, [auth, db, router]);

  // Exibe aviso de pagamento confirmado (success_url → /login?paid=1)
  useEffect(() => {
    const paid = search.get("paid");
    if (paid === "1") {
      alert("Pagamento confirmado. Faça login para continuar.");
    }
  }, [search]);

  if (loading || !uid) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-neutral-700">
        <div className="animate-spin h-5 w-5 rounded-full border-2 border-neutral-300 border-t-transparent" />
        <span>Carregando…</span>
      </div>
    );
  }

  return <>{children}</>;
}
