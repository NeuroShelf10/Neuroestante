// src/components/PageHeader.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useUser } from "@/context/UserProvider";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PageHeader() {
  const user = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const nome = user?.name?.trim() || "Usuário";
  const avatarUrl = user?.avatarUrl || "";

  async function handleLogout() {
    try {
      setLoading(true);
      await signOut(auth);
      router.replace("/auth");
    } catch {
      router.replace("/auth");
    } finally {
      setLoading(false);
    }
  }

  return (
    <header className="flex items-center justify-between">
      {/* Marca: LOGO + “Neuroestante” */}
      <Link href="/app" className="inline-flex items-center gap-3">
        {/* use /icons/logo-192.png (quadrada). Se tiver uma horizontal, troque o src por /icons/logo.png */}
        <Image
          src="/icons/logo-192.png"
          alt="Neuroestante"
          width={36}
          height={36}
          priority
          className="h-9 w-9"
        />
        <span className="text-xl sm:text-2xl font-semibold tracking-tight">
          Neuroestante
        </span>
      </Link>

      {/* Cartão do usuário com Editar | Sair */}
      <div className="inline-flex flex-col rounded-xl border bg-white px-3 py-2 hover:shadow-sm transition">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Foto do usuário"
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
          ) : (
            <div
              className="h-8 w-8 rounded-full bg-violet-600/10 grid place-items-center text-violet-700 text-sm font-medium select-none"
              aria-hidden
              title={nome}
            >
              {nome.slice(0, 1).toUpperCase()}
            </div>
          )}
          <Link href="/app/perfil" className="leading-tight">
            <div className="text-sm font-medium">{nome}</div>
          </Link>
        </div>

        <div className="mt-1 text-xs text-gray-600 flex items-center gap-2">
          <Link href="/app/perfil" className="hover:underline">editar</Link>
          <span aria-hidden>•</span>
          <button
            onClick={handleLogout}
            className="hover:underline disabled:opacity-60"
            disabled={loading}
            title="Sair da conta"
          >
            {loading ? "saindo…" : "sair"}
          </button>
        </div>
      </div>
    </header>
  );
}
