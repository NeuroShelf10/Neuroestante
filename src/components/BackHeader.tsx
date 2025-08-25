// src/components/BackHeader.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

type Props = {
  title: string;
  /** Para onde ir caso não dê para "voltar" no histórico (acesso direto à URL) */
  backHref: string;
  /** Slot opcional à direita (ex.: botão "Novo", "Salvar", etc.) */
  rightSlot?: React.ReactNode;
  /** Rótulo acessível do botão voltar */
  backAriaLabel?: string;
};

export default function BackHeader({
  title,
  backHref,
  rightSlot,
  backAriaLabel = "Voltar",
}: Props) {
  const router = useRouter();

  function handleBack(e: React.MouseEvent<HTMLAnchorElement>) {
    // Tenta voltar no histórico; se não houver, vai para backHref
    e.preventDefault();
    // Heurística simples: se houver referrer do mesmo site, volta; senão, push
    if (document.referrer && new URL(document.referrer).origin === location.origin) {
      router.back();
    } else {
      router.push(backHref);
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Seta de voltar */}
          <Link
            href={backHref}
            onClick={handleBack}
            aria-label={backAriaLabel}
            className="group inline-flex items-center justify-center rounded-lg border bg-white h-9 w-9 hover:bg-gray-50"
          >
            {/* Ícone inline (sem dependências) */}
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              className="stroke-current text-gray-700 group-hover:text-gray-900"
            >
              <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          <h1 className="text-base sm:text-lg lg:text-xl font-semibold tracking-tight">
            {title}
          </h1>
        </div>

        {/* Ações à direita (opcional) */}
        {rightSlot ? <div className="flex items-center gap-2">{rightSlot}</div> : (
          // Atalho opcional para Início (deixa a UI mais “destravada” no mobile)
          <Link
            href="/app"
            className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 underline-offset-4 hover:underline"
            aria-label="Ir para Início"
          >
            Início
          </Link>
        )}
      </div>
    </header>
  );
}
