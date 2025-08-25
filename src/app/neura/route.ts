import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs"; // ou "edge" se preferir

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { uid, messages } = (await req.json()) as {
      uid?: string;
      messages: { role: "user" | "assistant" | "system"; content: string }[];
    };

    // prompt de sistema com limites/escopo
    const systemMsg = {
      role: "system" as const,
      content:
        "Você é a Neura, uma assistente para psicólogos. Ajude com organização de protocolos, resumo de materiais e referências. " +
        "NÃO forneça diagnóstico clínico. Seja objetiva, empática, cite passos. Se algo envolver decisões clínicas, recomende buscar supervisão.",
    };

    const completion = await client.chat.completions.create({
      // modelos bons/custos ok:
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [systemMsg, ...(messages || [])],
    });

    const reply = completion.choices[0]?.message?.content ?? "Sem resposta.";
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error(err);
    return new NextResponse(
      `Erro na Neura: ${err?.message || "falha inesperada"}`,
      { status: 500 }
    );
  }
}
