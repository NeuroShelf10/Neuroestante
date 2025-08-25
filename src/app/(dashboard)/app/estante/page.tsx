// src/app/(dashboard)/app/estante/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useUser } from "@/context/UserProvider";

type Formatos = { manual: boolean; caderno: boolean; informatizado: boolean };

type TestDoc = {
  id: string;
  ownerId: string;
  sigla: string;
  nome: string;
  completo: boolean;
  dominios: string[];
  formatos: Formatos;
  folhas?: number;
  precoPorFolha?: number;
  createdAt?: any;
};

const ALL_DOMINIOS = [
  "Atenção",
  "Memória",
  "Funções Executivas",
  "Visuoespacial",
  "Linguagem",
  "Inteligência",
  "Outros",
];

function parseNumberLoose(v: string): number | undefined {
  const s = (v ?? "").toString().trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export default function EstantePage() {
  const user = useUser();
  const uid = user?.uid!;

  // Form
  const [q, setQ] = useState("");
  const [sigla, setSigla] = useState("");
  const [nome, setNome] = useState("");
  const [folhas, setFolhas] = useState("");
  const [preco, setPreco] = useState("");
  const [completo, setCompleto] = useState(true);
  const [formatos, setFormatos] = useState<Formatos>({
    manual: true,
    caderno: false,
    informatizado: false,
  });
  const [selecionados, setSelecionados] = useState<string[]>([]);

  // Dados
  const [tests, setTests] = useState<TestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const ref = collection(db, "tests");
    // sem orderBy para não exigir índice composto (pode voltar depois)
    const qy = query(ref, where("ownerId", "==", uid));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows: TestDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        // ordena no cliente por createdAt desc
        rows.sort((a, b) => {
          const ma = typeof a.createdAt?.toMillis === "function" ? a.createdAt.toMillis() : 0;
          const mb = typeof b.createdAt?.toMillis === "function" ? b.createdAt.toMillis() : 0;
          return mb - ma;
        });
        setTests(rows);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(
          err?.code === "failed-precondition"
            ? "O Firestore precisa de um índice. Você pode criar e recarregar a página."
            : "Não foi possível carregar seus testes."
        );
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  function toggleDominio(d: string) {
    setSelecionados((arr) => (arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d]));
  }
  function toggleFormato(key: keyof Formatos) {
    setFormatos((f) => ({ ...f, [key]: !f[key] }));
  }

  async function onAdicionarTeste(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!sigla.trim() || !nome.trim()) {
      setError("Preencha ao menos Sigla e Nome do teste.");
      return;
    }

    const folhasN = parseNumberLoose(folhas);
    const precoN = parseNumberLoose(preco);

    try {
      setSaving(true);
      await addDoc(collection(db, "tests"), {
        ownerId: uid,
        sigla: sigla.trim(),
        nome: nome.trim(),
        completo,
        dominios: selecionados,
        formatos,
        folhas: folhasN,
        precoPorFolha: precoN,
        createdAt: serverTimestamp(),
      });
      // limpa o form
      setSigla("");
      setNome("");
      setFolhas("");
      setPreco("");
      setCompleto(true);
      setFormatos({ manual: true, caderno: false, informatizado: false });
      setSelecionados([]);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  // ✅ SEMPRE calcular a lista filtrada no topo (fora de condicionais)
  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return tests;
    return tests.filter(
      (t) =>
        t.sigla?.toLowerCase().includes(term) ||
        t.nome?.toLowerCase().includes(term)
    );
  }, [q, tests]);

  return (
    <div className="space-y-4">
      {/* Busca */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Procurar teste"
        className="w-full rounded-xl border px-3 py-2"
      />

      {/* Formulário */}
      <form onSubmit={onAdicionarTeste} className="rounded-2xl border bg-white p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-xs text-gray-500">Sigla</label>
            <input
              value={sigla}
              onChange={(e) => setSigla(e.target.value)}
              placeholder="ex.: d2-R"
              className="rounded-lg border px-3 py-2"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs text-gray-500">Nome do teste</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do teste"
              className="rounded-lg border px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2">
              <label className="text-xs text-gray-500">Folhas</label>
              <input
                value={folhas}
                onChange={(e) => setFolhas(e.target.value)}
                placeholder="ex.: 12"
                className="rounded-lg border px-3 py-2"
                inputMode="numeric"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs text-gray-500">Preço por folha</label>
              <input
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="ex.: 1,36"
                className="rounded-lg border px-3 py-2"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="chk-completo"
              type="checkbox"
              checked={completo}
              onChange={(e) => setCompleto(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="chk-completo" className="text-sm">
              Completo
            </label>
          </div>
        </div>

        {/* Domínios (chips) */}
        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-1">Domínios cognitivos</div>
          <div className="flex flex-wrap gap-2">
            {ALL_DOMINIOS.map((d) => {
              const active = selecionados.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDominio(d)}
                  className={`px-3 h-9 rounded-full border text-sm transition ${
                    active
                      ? "bg-violet-50 border-violet-200 text-violet-700"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Formatos */}
        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-1">Formato</div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={formatos.manual}
                onChange={() => toggleFormato("manual")}
              />
              Manual
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={formatos.caderno}
                onChange={() => toggleFormato("caderno")}
              />
              Caderno
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={formatos.informatizado}
                onChange={() => toggleFormato("informatizado")}
              />
              Informatizado
            </label>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-violet-600 text-white px-4 h-10 hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Adicionar Teste"}
          </button>
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>

      {/* Listagem */}
      <section className="rounded-2xl border border-dashed p-4 sm:p-6">
        {loading ? (
          <div className="text-center text-gray-500">Carregando…</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center text-gray-500">Nenhum teste encontrado.</div>
        ) : (
          <ul className="grid gap-3">
            {filtrados.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-6 px-2 rounded-md bg-violet-50 text-violet-700 text-xs font-medium">
                      {t.sigla}
                    </span>
                    <h3 className="font-medium truncate">{t.nome}</h3>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-gray-600">
                    {t.dominios?.map((d) => (
                      <span key={d} className="px-2 py-0.5 rounded-full border">
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {t.completo ? "Completo" : "Parcial"}
                    {typeof t.folhas === "number" ? ` • ${t.folhas} folhas` : ""}
                    {typeof t.precoPorFolha === "number"
                      ? ` • R$ ${t.precoPorFolha.toFixed(2)} / folha`
                      : ""}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button className="rounded-lg border px-3 h-9 text-sm" disabled>
                    Editar
                  </button>
                  <button className="rounded-lg border px-3 h-9 text-sm" disabled>
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
