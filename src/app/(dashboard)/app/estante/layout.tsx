// src/app/(dashboard)/app/estante/layout.tsx
import Link from "next/link";
import BackHeader from "@/components/BackHeader";

export default function EstanteSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackHeader
        title="Estante"
        backHref="/app"
        rightSlot={
          <Link
            href="/app/estante/novo"
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 h-9 text-sm hover:bg-gray-50"
          >
            <span className="text-lg leading-none">＋</span>
            <span>Mais testes</span>
          </Link>
        }
      />
      {/* Espaço padrão abaixo do header */}
      <div className="py-6">{children}</div>
    </>
  );
}
