import type { Metadata } from "next";
import RequireAuth from "@/components/RequireAuth";
// ⬇️ Se o seu UserProvider for export default, troque para:
// import UserProvider from "@/context/UserProvider";
import { UserProvider } from "@/context/UserProvider";

export const metadata: Metadata = {
  title: "Neuroestante",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Garante: login + termo + assinatura (RequireAuth)
  // e contexto de usuário disponível (UserProvider)
  return (
    <RequireAuth>
      <UserProvider>{children}</UserProvider>
    </RequireAuth>
  );
}
