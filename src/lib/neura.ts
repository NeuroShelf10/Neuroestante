// src/lib/neura.ts
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function askNeura(prompt: string, history: ChatMessage[] = []) {
  const res = await fetch("/api/neura", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, history }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `Falha ${res.status}`);
  }
  return (await res.json()) as { reply: string };
}
