// src/app/sucesso/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function SucessoPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState("Validando sua sessão...");

  useEffect(() => {
    const sid = search.get("session_id");
    if (!sid) {
      setMsg("Sessão não informada.");
      return;
    }
    (async () => {
      try {
        const r = await fetch(`/api/verify-session?session_id=${sid}`, {
          method: "GET",
        });
        const data = await r.json();
        if (r.ok && data?.ok) {
          setMsg("Assinatura sincronizada. Redirecionando...");
          router.replace(data.active ? "/app" : "/cadastro");
        } else {
          setMsg("Sessão/usuário não encontrado.");
        }
      } catch {
        setMsg("Erro ao validar sessão.");
      }
    })();
  }, [search, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-6 bg-white rounded-2xl shadow text-center">
        <h1 className="text-xl font-bold mb-2">Sucesso</h1>
        <p className="text-sm text-gray-600">{msg}</p>
      </div>
    </div>
  );
}
