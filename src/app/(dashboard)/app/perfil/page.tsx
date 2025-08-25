"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useSetUser, useUser } from "@/context/UserProvider";

type FormState = {
  email: string;
  crp: string;
  name: string;
  avatarUrl?: string; // data URL ou remota
};

export default function PerfilPage() {
  const user = useUser();
  const setUser = useSetUser();
  const [form, setForm] = useState<FormState>({
    email: user?.email ?? "",
    crp: user?.crp ?? "",
    name: user?.name ?? "",
    avatarUrl: user?.avatarUrl,
  });

  useEffect(() => {
    setForm({
      email: user?.email ?? "",
      crp: user?.crp ?? "",
      name: user?.name ?? "",
      avatarUrl: user?.avatarUrl,
    });
  }, [user]);

  const onFile = async (file?: File) => {
    if (!file) return;
    // converte pra DataURL (funciona offline, sem backend)
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, avatarUrl: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  };

  const onSave = () => {
    setUser({
      email: form.email,
      crp: form.crp,
      name: form.name,
      avatarUrl: form.avatarUrl,
    });
    alert("Perfil atualizado!");
  };

  return (
    <div className="page-container pt-0">
      <PageHeader />

      <h2 className="heading-1 mb-4">Perfil</h2>

      <div className="flex items-center gap-4 mb-4">
        <img
          src={form.avatarUrl || "/icons/perfil.png"}
          alt="avatar"
          className="h-16 w-16 rounded-xl object-cover border border-slate-200"
        />
        <label className="btn cursor-pointer">
          Trocar foto
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
      </div>

      <div className="grid max-w-xl gap-3">
        <div>
          <label className="muted block mb-1">E-mail</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@exemplo.com"
          />
        </div>
        <div>
          <label className="muted block mb-1">CRP</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.crp}
            onChange={(e) => setForm({ ...form, crp: e.target.value })}
            placeholder="06/000000"
          />
        </div>
        <div>
          <label className="muted block mb-1">Nome</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Seu nome"
          />
        </div>

        <div className="mt-3">
          <button onClick={onSave} className="btn-primary px-4 py-2 rounded-lg">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
