// src/app/(dashboard)/app/page.tsx
import Link from "next/link";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import InstallPWAButton from "@/components/InstallPWAButton";

type TileProps = {
  href: string;
  title: string;
  iconSrc: string; // SVG/PNG em /public
  alt: string;
};

function Tile({ href, title, iconSrc, alt }: TileProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border p-5 hover:shadow-sm transition bg-white"
    >
      <div className="flex items-center gap-3">
        <Image src={iconSrc} alt={alt} width={48} height={48} priority className="h-12 w-12" />
        <h3 className="text-base font-medium group-hover:opacity-90">{title}</h3>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <PageHeader />

      {/* Botão de instalar (PC e mobile) */}
      <div className="max-w-4xl mx-auto flex justify-end">
        <InstallPWAButton />
      </div>

      {/* Grade 2x2 no desktop, 1x2 no mobile */}
      <section className="max-w-4xl mx-auto grid gap-5 grid-cols-1 sm:grid-cols-2">
        <Tile href="/app/estante"   title="Estante"    iconSrc="/icons/estante.svg"  alt="Estante" />
        <Tile href="/app/pacientes" title="Pacientes"  iconSrc="/icons/paciente.svg" alt="Pacientes" />
        <Tile href="/app/links"     title="Links"      iconSrc="/icons/file.svg"     alt="Links" />
        <Tile href="/app/neura"     title="Neura (IA)" iconSrc="/icons/neura.svg"    alt="Neura" />
      </section>
    </div>
  );
}
