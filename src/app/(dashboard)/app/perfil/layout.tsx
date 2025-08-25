// src/app/(dashboard)/app/perfil/layout.tsx
import BackHeader from "@/components/BackHeader";

export default function PerfilSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackHeader title="Perfil" backHref="/app" />
      {children}
    </>
  );
}
