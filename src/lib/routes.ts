export const ROUTES = {
  login: "/login",
  cadastro: "/cadastro",
  consentimento: "/consentimento",
  appRoot: "/app",
  assinatura: "/assinatura",
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES];
