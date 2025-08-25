// Helper para pegar o ID Token atual do Firebase Auth no cliente
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";

export async function getIdTokenOrThrow(): Promise<string> {
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não está logado.");
  return await user.getIdToken(/* forceRefresh? */ true);
}
