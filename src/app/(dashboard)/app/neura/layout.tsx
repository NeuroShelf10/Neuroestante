// src/app/(dashboard)/app/neura/layout.tsx
import BackHeader from "@/components/BackHeader";

export default function NeuraSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackHeader title="Neura" backHref="/app" />
      {children}
    </>
  );
}
