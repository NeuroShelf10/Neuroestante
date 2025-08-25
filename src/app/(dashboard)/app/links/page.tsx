// src/app/(dashboard)/app/links/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BackHeader from "@/components/BackHeader";
import { useUser } from "@/context/UserProvider";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

type LinkDoc = {
  id: string;
  ownerId: string;
  title: string;
  url: string;
  note?: string;
  pinned?: boolean;
  createdAt?: any;
};

function normalizeUrl(u: string) {
  const t = u.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return "https://" + t;
}

export default function LinksPage() {
  const user = useUser();
  const uid = user?.uid!;

  // form
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [pinned, setPinned] = useState(false);

  // data
  const [items, setItems] = useState<LinkDoc[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // carregar
  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const ref = collection(db, "links");
    // sem orderBy para não exigir índice composto; ordenamos no cliente
    const qy = query(ref, where("ownerId", "==", uid));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows: LinkDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        rows.sort((a, b) => {
          const pa = a.pinned ? 1 : 0;
          const pb = b.pinned ? 1 : 0;
          if (pb !== pa) return pb - pa; // fixados primeiro
          const ma = typeof a.createdAt?.toMillis === "function" ? a.createdAt.toMillis() : 0;
          const mb = typeof b.createdAt?.toMillis === "function" ? b.createdAt.toMillis() : 0;
          return mb - ma;
        });
        setItems(rows);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Não foi possível carregar seus links.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const t = title.trim();
    const u = normalizeUrl(url);
    if (!t || !u) {
      setError("Preencha Título e URL.");
      return;
    }

    try {
      setSaving(true);
      await addDoc(collection(db, "links"), {
        ownerId: uid,
        title: t,
        url: u,
        note: note.trim() || undefined,
        pinned,
        createdAt: serverTimestamp(),
      });

      // limpar
      setTitle("");
      setUrl("");
      setNote("");
      setPinned(false);
    } catch (err) {
      console.error(err);
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Excluir este link?")) return;
    try {
      await deleteDoc(doc(db, "links", id));
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir.");
    }
  }

  // filtro por termo (título, url, nota)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (it) =>
        it.title?.toLowerCase().includes(term) ||
        it.url?.toLowerCase().includes(term) ||
        it.note?.toLowerCase().includes(term)
    );
  }, [items, q]);

  return (
    <div className="space-y-4">
      <BackHeader title="Links" backHref="/app" backAriaLabel="Voltar" />

      {/* busca */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por título, URL ou nota"
        className="rounded-xl border px-3 py-2"
      />

      {/* formulário */}
      <form onSubmit={onAdd} className="rounded-2xl border bg-white p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-xs text-gray-500">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Planilha de escalas"
              className="rounded-lg border px-3 py-2"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-gray-500">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-lg border px-3 py-2"
            />
          </div>

          <div className="grid gap-2 md:col-span-2">
            <label className="text-xs text-gray-500">Nota (opcional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Use a nota para marcar categorias ou lembretes"
              className="rounded-lg border px-3 py-2"
            />
          </div>

          <label className="mt-2 inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            Fixar no topo
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-violet-600 text-white px-4 h-10 hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Adicionar link"}
          </button>
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>

      {/* listagem */}
      <section className="rounded-2xl border border-dashed p-4 sm:p-6">
        {loading ? (
          <div className="text-center text-gray-500">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500">Nenhum link encontrado.</div>
        ) : (
          <ul className="grid gap-3">
            {filtered.map((l) => (
              <li
                key={l.id}
                className="rounded-xl border bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {l.pinned && (
                      <span className="inline-flex items-center justify-center h-5 px-2 rounded-md bg-yellow-50 text-yellow-700 text-[11px] font-medium">
                        fixado
                      </span>
                    )}
                    <h3 className="font-medium truncate">{l.title}</h3>
                  </div>
                  <Link
                    href={l.url}
                    target="_blank"
                    className="text-sm text-violet-700 hover:underline break-all"
                  >
                    {l.url}
                  </Link>
                  {l.note && (
                    <div className="text-xs text-gray-500">
                      {l.note}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Link
                    href={l.url}
                    target="_blank"
                    className="rounded-lg border px-3 h-9 text-sm hover:bg-gray-50"
                  >
                    Abrir
                  </Link>
                  <button
                    onClick={() => onDelete(l.id)}
                    className="rounded-lg border px-3 h-9 text-sm hover:bg-gray-50"
                    title="Excluir"
                  >
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
