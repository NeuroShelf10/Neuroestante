// src/app/(dashboard)/error.tsx
"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("Dashboard error:", error);

  return (
    <div className="min-h-dvh grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white shadow-sm p-6 grid gap-3">
        <h1 className="text-lg font-semibold">Não foi possível abrir esta área</h1>
        <p className="text-sm text-gray-600">
          Tente novamente. Se persistir, volte ao início.
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-violet-600 text-white px-3 py-2"
          >
            Tentar novamente
          </button>
          <a
            href="/app"
            className="rounded-lg border px-3 py-2 hover:bg-gray-50"
          >
            Início
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
  );
}
