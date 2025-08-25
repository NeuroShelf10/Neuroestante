// src/app/(dashboard)/page.tsx
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import {
  BookshelfIcon,
  UsersIcon,
  LinkIcon as ChainIcon,
  BrainIcon,
} from "@/components/icons";
import type { ComponentType, SVGProps } from "react";

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

type TileProps = {
  href: string;
  title: string;
  Icon: IconType;
};

function Tile({ href, title, Icon }: TileProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border p-4 md:p-5 hover:shadow-sm transition bg-white"
    >
      <div className="flex items-center gap-3">
        <Icon size={48} className="shrink-0 text-violet-700" />
        <h3 className="text-sm md:text-base font-medium group-hover:opacity-90">
          {title}
        </h3>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <PageHeader />

      <section className="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <Tile href="/app/estante"   title="Estante"    Icon={BookshelfIcon} />
        <Tile href="/app/pacientes" title="Pacientes"  Icon={UsersIcon} />
        <Tile href="/app/links"     title="Links"      Icon={ChainIcon} />
        <Tile href="/app/neura"     title="Neura (IA)" Icon={BrainIcon} />
      </section>
    </div>
  );
}
