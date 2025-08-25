"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const APP_HOME = "/app";
const CONSENT = "/consentimento";
const CADASTRO = "/cadastro";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Mensagens após checkout (?paid=1) ou cancel (?canceled=1)
  useEffect(() => {
    const paid = search.get("paid");
    const canceled = search.get("canceled");
    if (paid === "1") setMsg("Pagamento confirmado! Faça login para entrar.");
    if (canceled === "1") setMsg("Pagamento cancelado. Você pode tentar novamente.");
  }, [search]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      if (!email || !senha) throw new Error("Informe e-mail e senha.");

      const cred = await signInWithEmailAndPassword(auth, email, senha);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      const data = snap.data() as any;

      if (!data?.consentAccepted) {
        router.replace(CONSENT);
        return;
      }

      router.replace(APP_HOME);
    } catch (err: any) {
      setMsg(err?.message || "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    try {
      if (!email) {
        setMsg("Digite seu e-mail para enviar o reset de senha.");
        return;
      }
      await sendPasswordResetEmail(auth, email);
      setMsg("Enviamos um e-mail para redefinir sua senha.");
    } catch (err: any) {
      setMsg(err?.message || "Erro ao enviar o e-mail de reset.");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-100 p-6">
      <div className="w-full max-w-md bg-white shadow rounded-2xl p-6">
        <h1 className="text-xl font-bold text-center mb-6">Login</h1>

        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 py-2 text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <span className="text-gray-700">Não tem conta?</span>{" "}
          <Link href={CADASTRO} className="text-violet-700 underline">
            Cadastre-se
          </Link>
        </div>

        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-gray-600 underline"
          >
            Esqueci minha senha
          </button>
        </div>

        {msg && <p className="mt-4 text-center text-sm text-red-600">{msg}</p>}
      </div>
    </div>
  );
}
