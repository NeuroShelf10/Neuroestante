// src/components/InstallPWAButton.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallPWAButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  const isIOS = useMemo(
    () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent),
    []
  );

  useEffect(() => {
    // já instalado? (Chrome/Edge/PWA)
    const checkStandalone = () => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        // Safari iOS
        (window as any).navigator?.standalone === true;
      setInstalled(Boolean(standalone));
    };
    checkStandalone();

    const onChange = () => checkStandalone();
    window.addEventListener("visibilitychange", onChange);

    // captura o evento do prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler as any);

    // se instalar via UI do navegador
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler as any);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("visibilitychange", onChange);
    };
  }, []);

  if (installed) return null;

  // Android/desktop (Chromium): mostra botão real quando o prompt está disponível
  if (deferred && !isIOS) {
    const clickInstall = async () => {
      try {
        await deferred.prompt();
        await deferred.userChoice; // opcional: avaliar outcome
        setDeferred(null);
      } catch {
        /* noop */
      }
    };
    return (
      <button
        onClick={clickInstall}
        className="rounded-lg border px-3 h-9 text-sm hover:bg-gray-50"
        title="Instalar aplicativo"
      >
        Instalar app
      </button>
    );
  }

  // iOS (sem prompt): mostra botão que abre instruções
  if (isIOS) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowIosHelp((v) => !v)}
          className="rounded-lg border px-3 h-9 text-sm hover:bg-gray-50"
        >
          Instalar app
        </button>
        {showIosHelp && (
          <div className="absolute right-0 mt-2 w-72 rounded-xl border bg-white p-3 text-sm shadow-lg z-10">
            <div className="font-medium mb-1">Como instalar no iPhone</div>
            <ol className="list-decimal ml-5 space-y-1 text-gray-700">
              <li>Toque em <b>Compartilhar</b> (ícone de seta para cima).</li>
              <li>Escolha <b>“Adicionar à Tela de Início”</b>.</li>
              <li>Confirme em <b>Adicionar</b>.</li>
            </ol>
            <button
              className="mt-2 text-xs text-gray-500 hover:underline"
              onClick={() => setShowIosHelp(false)}
            >
              fechar
            </button>
          </div>
        )}
      </div>
    );
  }

  // Demais casos: oculto até o navegador disparar o beforeinstallprompt
  return null;
}
