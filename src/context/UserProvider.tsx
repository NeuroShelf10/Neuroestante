"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  onSnapshot,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";

/** ---- Tipos do documento de usuário ---- */
type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "lifetime";

export type UserDoc = {
  name?: string | null;
  email?: string | null;
  acceptedTermsAt?: Timestamp | null;
  subscriptionStatus?: SubscriptionStatus;
  trialEndAt?: Timestamp | null;
  currentPeriodEnd?: Timestamp | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  // campos de housekeeping vindos do webhook:
  updatedAt?: Timestamp | null;
  lastCouponCode?: string | null;
} & DocumentData;

type UserContextValue = {
  /** Usuário do Firebase Auth (ou null) */
  firebaseUser: FirebaseUser | null;
  /** Alias de firebaseUser pra conveniência */
  user: FirebaseUser | null;
  /** Documento do Firestore em users/{uid} (ou null) */
  userDoc: UserDoc | null;
  /** True enquanto carrega auth e o doc do usuário */
  loading: boolean;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

/** Hook de acesso fácil ao contexto */
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser precisa estar dentro de <UserProvider>");
  }
  return ctx;
}

/** Provider que observa o Auth e o doc do usuário */
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Observa login/logout
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setLoading(true);

      // Se logou, observa o doc users/{uid}; senão, limpa
      if (u) {
        const ref = doc(db, "users", u.uid);
        const unsubDoc = onSnapshot(
          ref,
          (snap) => {
            setUserDoc((snap.data() as UserDoc) ?? null);
            setLoading(false);
          },
          () => {
            setUserDoc(null);
            setLoading(false);
          }
        );
        return () => unsubDoc();
      } else {
        setUserDoc(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  const value: UserContextValue = {
    firebaseUser,
    user: firebaseUser,
    userDoc,
    loading,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/** Export default também, caso algum arquivo esteja importando como default */
export default UserProvider;
