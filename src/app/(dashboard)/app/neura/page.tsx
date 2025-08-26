// src/app/(dashboard)/app/neura/page.tsx
"use client";

import { useState, type KeyboardEvent } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function NeuraPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Oi! Eu sou a Neura. Como posso ajudar? (ex.: dúvidas neuropsicológicas, protocolos, hipóteses diagnósticas, etc.)",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function send() {
    if (!input.trim() || loading) return;

    setError("");
    const newMsgs: Msg[] = [...messages, { role: "user", content: input }];
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/neura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "Você é a Neura, uma IA que ajuda psicólogos(as) com dúvidas clínicas e de avaliação neuropsicológica. Seja clara, ética e prática. Não faça diagnósticos sem contexto.",
            },
            ...newMsgs,
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao chamar a IA.");

      setMessages([...newMsgs, { role: "assistant", content: data.text }]);
    } catch (e: any) {
      setError(e?.message || "Erro inesperado.");
      setMessages(newMsgs); // mantém a pergunta do usuário na tela
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Neura (IA)</h1>

      <div className="border rounded-lg bg-white">
        <div className="h-[52vh] overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap p-3 rounded-md ${
                m.role === "user"
                  ? "bg-violet-50 text-violet-800 self-end"
                  : "bg-gray-50"
              }`}
            >
              <strong className="block text-xs uppercase mb-1">
                {m.role === "user" ? "Você" : "Neura"}
              </strong>
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="text-sm text-gray-500 italic">
              Neura está digitando…
            </div>
          )}
        </div>

        <div className="border-t p-3 flex items-end gap-2">
          <textarea
            className="flex-1 border rounded-md p-2 min-h-[60px] focus:outline-none"
            placeholder="Escreva sua pergunta… (Ctrl/⌘ + Enter para enviar)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            onClick={send}
            disabled={loading}
            className="px-4 py-2 rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
          >
            Enviar
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 mt-3">{error}</p>}
      <p className="text-xs text-gray-500 mt-3">
        Dica: Use Ctrl/⌘ + Enter para enviar. Evite dados sensíveis; descreva casos de forma
        anônima.
      </p>
    </div>
  );
}
