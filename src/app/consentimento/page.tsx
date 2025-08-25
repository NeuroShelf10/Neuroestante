"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

export default function ConsentimentoPage() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) {
      router.replace("/login");
      return;
    }
    setUid(u.uid);
    setLoading(false);
  }, [router]);

  async function handleAccept() {
    try {
      if (!uid) return;

      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setError("Não foi possível localizar seu cadastro. Tente novamente.");
        return;
      }

      await updateDoc(ref, {
        consentAccepted: true,
        consentAcceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // encerra a sessão e volta para a tela de login
      await signOut(auth);
      router.replace("/login");
    } catch (e: any) {
      setError(e?.message || "Falha ao salvar o consentimento.");
    }
  }

  if (loading) return <div className="p-6">Carregando…</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-md space-y-5">
        <h1 className="text-2xl font-semibold">Termos de Uso</h1>

        {/* Versão curta */}
        <div className="space-y-3 text-sm leading-6">
          <p>A Neuroestante está em fase inicial e pode apresentar falhas ou instabilidades.</p>
          <p>
            O usuário é responsável pelos dados inseridos, especialmente de pacientes,
            conforme o Código de Ética do Conselho de Psicologia.
          </p>
          <p>
            A Neura IA auxilia no preenchimento de informações, mas pode conter erros.
            Cabe ao profissional revisar e validar todo conteúdo.
          </p>

          <button
            type="button"
            onClick={() => setShowFull(true)}
            className="text-violet-700 underline"
          >
            Ler termo completo
          </button>

          {showFull && (
            <div className="border rounded-xl p-4 bg-gray-50 space-y-3 max-h-80 overflow-auto">
              <p>
                A plataforma <strong>Neuroestante</strong> encontra-se em fase inicial de
                desenvolvimento. Embora todos os esforços estejam sendo realizados para
                garantir estabilidade e usabilidade, poderão ocorrer falhas técnicas,
                travas temporárias ou indisponibilidades.
              </p>
              <p>
                O usuário é o <strong>único responsável</strong> pelas informações cadastradas,
                especialmente os dados de pacientes. Conforme o{" "}
                <strong>Código de Ética Profissional do Psicólogo</strong> (Resolução CFP nº 010/2005),
                o sigilo, a confidencialidade e a veracidade das informações são de
                responsabilidade do profissional.
              </p>
              <p>
                A plataforma disponibiliza recursos de apoio com uso de{" "}
                <strong>inteligência artificial (“Neura IA”)</strong>, que podem sugerir descrições,
                preenchimentos ou referências. A IA pode apresentar erros, imprecisões ou
                informações desatualizadas. As sugestões não substituem o julgamento clínico
                e técnico do profissional, que deve revisar e validar cada informação.
              </p>
              <p>
                Os dados são armazenados em servidores seguros e o acesso é individual.
                O usuário deve manter suas credenciais em sigilo. O acesso integral à
                plataforma depende da aceitação deste termo e da manutenção de uma
                assinatura ativa.
              </p>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowFull(false)}
                  className="rounded-lg px-3 py-2 border hover:bg-gray-100"
                >
                  Fechar termo completo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Aceite */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>Li e aceito os termos de uso</span>
        </label>

        <button
          onClick={handleAccept}
          disabled={!accepted}
          className="w-full rounded-lg bg-violet-600 py-2 text-white hover:bg-violet-700 disabled:opacity-50"
        >
          Aceitar e continuar
        </button>

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}
