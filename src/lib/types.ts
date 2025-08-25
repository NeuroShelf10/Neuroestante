export type Domain = "Atenção" | "Memória" | "Funções Executivas" | "Visuoespacial" | "Linguagem" | "Outros";

export interface Patient {
  id: string;
  nome: string;
  sigla: string;       // A. F. M.
  idade?: number;
  hipotese?: string;
  createdAt: number;
}

export interface TestItem {
  id: string;
  sigla: string;            // d2-R, FDT...
  nome: string;             // Teste D2 - Revisado
  dominios: Domain[];
  completo: boolean;        // completo/parcial
  folhas?: number;          // “Folhas 14”
  manual?: boolean;
  caderno?: boolean;
  precoFolha?: number;
  informatizado?: boolean;  // correção informatizada
  createdAt: number;
}

export interface SessionDay {
  id: string;
  dataISO: string;   // 2025-08-12
  descricao: string; // anamnese, aplicação...
}

export interface UserProfile {
  uid: string;
  nome: string;
  crp?: string;
  email: string;
  fotoURL?: string;
  assinaturaAtiva?: boolean;
}
