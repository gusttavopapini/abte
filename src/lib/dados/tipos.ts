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
  // Id do documento em categoriasDeArtigos.
  categoria: string;
  // Ids dos documentos em tagsDeArtigos.
  tags: string[];
  autores: string;
  link: string;
  resumo: string;
  status: string;
  criadoEm: Date | null;
  atualizadoEm: Date | null;
};

// Profissional do diretório (modelo de 10/10/2026). Contatos já padronizados
// pela validação (src/lib/contatos.ts): WhatsApp só com dígitos e código do
// país, Instagram só o usuário, Facebook o link completo. Sem foto até a
// biblioteca de mídia (etapa 4d). Com excluidoEm preenchido, está na lixeira.
export type Profissional = {
  id: string;
  tipo: string;
  tratamento: string;
  nome: string;
  registro: string;
  metodos: string[];
  pais: string;
  uf: string;
  cidades: string[];
  telerreabilitacao: boolean;
  whatsapp: string;
  instagram: string;
  facebook: string;
  email: string;
  bio: string;
  ativo: boolean;
  ordem: number;
  criadoEm: Date | null;
  atualizadoEm: Date | null;
  excluidoEm: Date | null;
};

// Tópicos dos artigos, editáveis no painel. O slug é criado com o nome e não
// muda ao renomear (os endereços públicos continuam valendo). Com excluidoEm
// preenchido, o tópico está na lixeira: some do site e pode ser restaurado.
export type TopicoDeArtigo = {
  id: string;
  nome: string;
  slug: string;
  // Ordem de exibição (só usada nas categorias; menor aparece primeiro).
  ordem: number;
  criadoEm: Date | null;
  atualizadoEm: Date | null;
  excluidoEm: Date | null;
};

export type TipoDeTopico = "categoria" | "tag";
