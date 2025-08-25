// src/app/error.tsx
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // opcional: log no console para diagnóstico
  console.error("Global error:", error);

  return (
    <html>
      <body>
        <div className="min-h-dvh grid place-items-center px-4">
          <div className="w-full max-w-md rounded-2xl border bg-white shadow-sm p-6 grid gap-3">
            <h1 className="text-lg font-semibold">Opa, algo deu errado</h1>
            <p className="text-sm text-gray-600">
              Um erro inesperado impediu a página de carregar.
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => reset()}
                className="rounded-lg bg-violet-600 text-white px-3 py-2"
              >
                Tentar novamente
              </button>
              <a
                href="/auth"
                className="rounded-lg border px-3 py-2 hover:bg-gray-50"
              >
                Ir para o login
              </a>
            </div>

            {process.env.NODE_ENV === "development" && (
              <pre className="mt-2 whitespace-pre-wrap text-xs text-red-600">
                {error?.message}
                {error?.stack ? `\n\n${error.stack}` : ""}
              </pre>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
