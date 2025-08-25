// src/app/(dashboard)/app/pacientes/layout.tsx
import BackHeader from "@/components/BackHeader";

export default function PacientesSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackHeader title="Pacientes" backHref="/app" />
      {children}
    </>
  );
}
