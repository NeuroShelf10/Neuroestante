// Inicialização única do Firebase Admin (USO SOMENTE NO SERVIDOR)
import { getApps, initializeApp, cert, App } from "firebase-admin/app";

let adminApp: App | null = null;

export function initAdmin() {
  if (!getApps().length) {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      }),
    });
  }
  return adminApp;
}
