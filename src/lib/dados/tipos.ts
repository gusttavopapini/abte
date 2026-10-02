// Tipos dos documentos do Firestore, do jeito que o site os usa.
// Sem dependências: o servidor usa os valores e o navegador importa só os tipos.
// Campos de texto ausentes no banco chegam como texto vazio; datas ausentes,
// como null (ver os conversores em colecoes.ts).

export type Post = {
  id: string;
  titulo: string;
  imagem: string;
  conteudo: string;
  status: string;
  slug: string;
  criadoEm: Date | null;
  atualizadoEm: Date | null;
};

export type Artigo = {
  id: string;
  titulo: string;
  categoria: string;
  autores: string;
  link: string;
  resumo: string;
  status: string;
  criadoEm: Date | null;
  atualizadoEm: Date | null;
};

export type Profissional = {
  id: string;
  nome: string;
  especialidade: string;
  tag: string;
  linkedinUrl: string;
  imagemUrl: string;
  status: string;
  criadoEm: Date | null;
  atualizadoEm: Date | null;
};
