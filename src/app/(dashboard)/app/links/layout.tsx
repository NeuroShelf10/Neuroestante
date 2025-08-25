// src/app/(dashboard)/app/links/layout.tsx
import BackHeader from "@/components/BackHeader";

export default function LinksSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackHeader title="Links" backHref="/app" />
      {children}
    </>
  );
}
