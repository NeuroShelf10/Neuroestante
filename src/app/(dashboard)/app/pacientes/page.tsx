// src/app/app/pacientes/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

/* ------------------------------ TYPES ---------------------------------- */

type Protocolo = { label: string; done: boolean };
type Sessao = { data: string; numero: number; nota: string };

type Paciente = {
  id: string;
  nome: string;
  sigla: string;
  dataNascimento?: string; // YYYY-MM-DD
  telefone?: string;
  email?: string;
  observacoes?: string;

  hipoteseDiagnostica?: string;
  protocolos?: Protocolo[];
  sessoes?: Sessao[];

  createdAt?: any;
  updatedAt?: any;
};

/* ------------------------------ HELPERS -------------------------------- */

function siglaFromName(nome?: string) {
  if (!nome) return "N/A";
  return nome
    .trim()
    .split(/\s+/)
    .map((p) => (p[0] ? p[0].toUpperCase() + "." : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
function initialsCompact(nome?: string) {
  if (!nome) return "P";
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "P";
  const first = parts[0][0]?.toUpperCase() ?? "";
  const last = parts[parts.length - 1][0]?.toUpperCase() ?? "";
  const mid = parts.length > 2 ? parts[1][0]?.toUpperCase() ?? "" : "";
  return (first + mid + last).slice(0, 3) || "P";
}
function idadeFromISO(date?: string) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  return `${years} anos`;
}
function brDate(date?: string) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}
function maskPhone(v?: string) {
  if (!v) return "";
  const d = v.replace(/\D/g, "");
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3").trim();
}
function maskEmail(e?: string) {
  if (!e) return "";
  const [u, d] = e.split("@");
  if (!u || !d) return e;
  const head = u.slice(0, 2);
  const tail = u.slice(-1);
  return `${head}***${tail}@${d}`;
}

/* ------------------------------ PAGE ----------------------------------- */

export default function PacientesPage() {
  const [uid, setUid] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Paciente[]>([]);
  const [busca, setBusca] = useState("");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<Paciente, "id" | "sigla" | "createdAt" | "updatedAt">>({
    nome: "",
    dataNascimento: "",
    telefone: "",
    email: "",
    observacoes: "",
    hipoteseDiagnostica: "",
    protocolos: [],
    sessoes: [],
  });

  /* ---------- Stripe Auth / Firestore feed ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return;
      setUid(u.uid);

      const col = collection(db, "users", u.uid, "patients");
      const q = query(col, orderBy("createdAt", "desc"));
      const uns = onSnapshot(q, (snap) => {
        const list: Paciente[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setItems(list);
        setLoading(false);
      });
      return () => uns();
    });
    return () => unsub();
  }, []);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return items;
    const b = busca.toLowerCase();
    return items.filter((p) =>
      [p.sigla, p.nome]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(b))
    );
  }, [items, busca]);

  /* ---------------------- Modal helpers ---------------------- */
  function abrirNovo() {
    setEditingId(null);
    setForm({
      nome: "",
      dataNascimento: "",
      telefone: "",
      email: "",
      observacoes: "",
      hipoteseDiagnostica: "",
      protocolos: [],
      sessoes: [],
    });
    setOpen(true);
  }
  function abrirEditar(p: Paciente) {
    setEditingId(p.id);
    setForm({
      nome: p.nome || "",
      dataNascimento: p.dataNascimento || "",
      telefone: p.telefone || "",
      email: p.email || "",
      observacoes: p.observacoes || "",
      hipoteseDiagnostica: p.hipoteseDiagnostica || "",
      protocolos: p.protocolos || [],
      sessoes: p.sessoes || [],
    });
    setOpen(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!uid || !form.nome.trim()) return;

    const payload = {
      ...form,
      sigla: siglaFromName(form.nome),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const col = collection(db, "users", uid, "patients");
    if (editingId) {
      const { createdAt, ...upd } = payload;
      await updateDoc(doc(col, editingId), upd);
    } else {
      await addDoc(col, payload);
    }
    setOpen(false);
  }

  async function apagar(id: string) {
    if (!uid) return;
    if (!confirm("Remover paciente?")) return;
    await deleteDoc(doc(db, "users", uid, "patients", id));
  }

  /* ---------------------- Protocolos UI ---------------------- */
  const [novoProtocolo, setNovoProtocolo] = useState("");
  function addProtocolo() {
    const label = novoProtocolo.trim();
    if (!label) return;
    setForm((f) => ({
      ...f,
      protocolos: [...(f.protocolos || []), { label, done: false }],
    }));
    setNovoProtocolo("");
  }
  function toggleProtocolo(idx: number) {
    setForm((f) => {
      const arr = [...(f.protocolos || [])];
      arr[idx] = { ...arr[idx], done: !arr[idx].done };
      return { ...f, protocolos: arr };
    });
  }
  function removeProtocolo(idx: number) {
    setForm((f) => {
      const arr = [...(f.protocolos || [])];
      arr.splice(idx, 1);
      return { ...f, protocolos: arr };
    });
  }

  /* ---------------------- Sessões UI ---------------------- */
  const [sessaoTemp, setSessaoTemp] = useState<Sessao>({
    data: "",
    numero: 1,
    nota: "",
  });
  function addSessao() {
    if (!sessaoTemp.data || !sessaoTemp.numero) return;
    setForm((f) => ({
      ...f,
      sessoes: [...(f.sessoes || []), { ...sessaoTemp }],
    }));
    setSessaoTemp({ data: "", numero: (sessaoTemp.numero || 1) + 1, nota: "" });
  }
  function removeSessao(idx: number) {
    setForm((f) => {
      const arr = [...(f.sessoes || [])];
      arr.splice(idx, 1);
      return { ...f, sessoes: arr };
    });
  }

  /* ------------------------------ RENDER ------------------------------ */

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Pacientes</h1>
        <button
          onClick={abrirNovo}
          className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm hover:bg-violet-700"
        >
          + PACIENTE
        </button>
      </div>

      <div className="mb-5">
        <input
          className="w-full border rounded-xl px-4 py-2 text-sm"
          placeholder="Pesquisar por sigla…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="rounded-2xl border bg-white p-6 text-center text-gray-500">
            Carregando…
          </div>
        )}

        {!loading && filtrados.length === 0 && (
          <div className="rounded-2xl border bg-white p-6 text-center text-gray-500">
            Nenhum paciente encontrado.
          </div>
        )}

        {filtrados.map((p) => {
          const totalProt = (p.protocolos || []).length;
          const feitos = (p.protocolos || []).filter((x) => x.done).length;
          const sessoesCount = (p.sessoes || []).length;

          return (
            <div
              key={p.id}
              className="rounded-2xl border bg-white p-4 flex items-center justify-between hover:shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-violet-600 text-white grid place-content-center text-sm font-semibold">
                  {initialsCompact(p.nome)}
                </div>
                <div>
                  <div className="font-semibold">{p.sigla || siglaFromName(p.nome)}</div>
                  <div className="text-xs text-gray-500">
                    {p.dataNascimento
                      ? `${idadeFromISO(p.dataNascimento)} • ${brDate(p.dataNascimento)}`
                      : "Idade indisponível"}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {maskPhone(p.telefone)}
                    {p.telefone && p.email ? " • " : ""}
                    {maskEmail(p.email)}
                  </div>
                  {(totalProt > 0 || sessoesCount > 0) && (
                    <div className="text-[11px] text-gray-500 mt-1">
                      {totalProt > 0 && (
                        <span className="mr-3">Protocolos: {feitos}/{totalProt}</span>
                      )}
                      {sessoesCount > 0 && <span>Sessões: {sessoesCount}</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => abrirEditar(p)}
                  className="px-3 py-1.5 rounded-xl border text-sm hover:bg-white"
                >
                  Editar
                </button>
                <button
                  onClick={() => apagar(p.id)}
                  className="px-3 py-1.5 rounded-xl border text-sm text-red-600 hover:bg-red-50"
                >
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold">
                {editingId ? "Editar paciente" : "Novo paciente"}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="px-2 py-1 rounded-lg border hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={salvar} className="p-5 grid gap-6">
              {/* Identificação */}
              <div>
                <label className="block text-sm mb-1">Nome completo *</label>
                <input
                  className="w-full border rounded-xl px-3 py-2"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  required
                  placeholder="Ex.: João da Silva"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Sigla gerada: <b>{siglaFromName(form.nome)}</b>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm mb-1">Nascimento</label>
                  <input
                    type="date"
                    className="w-full border rounded-xl px-3 py-2"
                    value={form.dataNascimento || ""}
                    onChange={(e) =>
                      setForm({ ...form, dataNascimento: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Telefone</label>
                  <input
                    className="w-full border rounded-xl px-3 py-2"
                    value={form.telefone || ""}
                    onChange={(e) =>
                      setForm({ ...form, telefone: e.target.value })
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">E-mail</label>
                  <input
                    type="email"
                    className="w-full border rounded-xl px-3 py-2"
                    value={form.email || ""}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              {/* Hipótese diagnóstica */}
              <div>
                <label className="block text-sm mb-1">Hipótese diagnóstica</label>
                <textarea
                  className="w-full border rounded-xl px-3 py-2 min-h-[70px]"
                  value={form.hipoteseDiagnostica || ""}
                  onChange={(e) =>
                    setForm({ ...form, hipoteseDiagnostica: e.target.value })
                  }
                  placeholder="Descreva a hipótese diagnóstica inicial…"
                />
              </div>

              {/* Protocolos (Checklist) */}
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Protocolo de avaliação (checklist)
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    className="flex-1 border rounded-xl px-3 py-2"
                    placeholder="Ex.: WISC-V, Figuras Complexas de Rey…"
                    value={novoProtocolo}
                    onChange={(e) => setNovoProtocolo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addProtocolo())}
                  />
                  <button
                    type="button"
                    onClick={addProtocolo}
                    className="px-4 py-2 rounded-xl border hover:bg-gray-50"
                  >
                    Adicionar
                  </button>
                </div>

                {(form.protocolos || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.protocolos!.map((p, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-2 border rounded-xl px-3 py-1.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={p.done}
                          onChange={() => toggleProtocolo(i)}
                          className="accent-violet-600"
                        />
                        <span className={p.done ? "line-through text-gray-500" : ""}>
                          {p.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeProtocolo(i)}
                          className="ml-1 text-gray-400 hover:text-red-600"
                          title="Remover"
                        >
                          ×
                        </button>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Sessões */}
              <div className="grid gap-3">
                <label className="text-sm font-medium">
                  Dias/sessões (nº da sessão e breve descrição)
                </label>

                <div className="grid grid-cols-1 md:grid-cols-[150px_120px_1fr_auto] gap-2">
                  <input
                    type="date"
                    className="border rounded-xl px-3 py-2"
                    value={sessaoTemp.data}
                    onChange={(e) =>
                      setSessaoTemp((s) => ({ ...s, data: e.target.value }))
                    }
                  />
                  <input
                    type="number"
                    min={1}
                    className="border rounded-xl px-3 py-2"
                    value={sessaoTemp.numero}
                    onChange={(e) =>
                      setSessaoTemp((s) => ({ ...s, numero: Number(e.target.value) }))
                    }
                    placeholder="Nº"
                  />
                  <input
                    className="border rounded-xl px-3 py-2"
                    value={sessaoTemp.nota}
                    onChange={(e) =>
                      setSessaoTemp((s) => ({ ...s, nota: e.target.value }))
                    }
                    placeholder="Breve descrição do que foi feito…"
                  />
                  <button
                    type="button"
                    onClick={addSessao}
                    className="px-4 py-2 rounded-xl border hover:bg-gray-50"
                  >
                    Adicionar
                  </button>
                </div>

                {(form.sessoes || []).length > 0 && (
                  <div className="border rounded-xl divide-y">
                    {form.sessoes!.map((s, i) => (
                      <div key={i} className="grid grid-cols-1 md:grid-cols-[150px_120px_1fr_auto] gap-2 p-3">
                        <div className="text-sm">{brDate(s.data)}</div>
                        <div className="text-sm">Sessão {s.numero}</div>
                        <div className="text-sm text-gray-600">{s.nota}</div>
                        <button
                          type="button"
                          onClick={() => removeSessao(i)}
                          className="px-2 py-1 rounded-lg border text-red-600 hover:bg-red-50 text-sm"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Observações gerais */}
              <div>
                <label className="block text-sm mb-1">Observações</label>
                <textarea
                  className="w-full border rounded-xl px-3 py-2 min-h-[80px]"
                  value={form.observacoes || ""}
                  onChange={(e) =>
                    setForm({ ...form, observacoes: e.target.value })
                  }
                  placeholder="Anotações clínicas, preferências, contatos de emergência…"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-xl border hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700"
                >
                  {editingId ? "Salvar alterações" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
