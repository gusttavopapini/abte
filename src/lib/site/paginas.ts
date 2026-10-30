// Páginas institucionais editáveis (30/10/2026): coleção paginasInstitucionais,
// um documento por slug (acessibilidade, politica-de-privacidade,
// termos-de-uso). Editadas em /admin/paginas, só pelo administrador. Puro (sem
// Firebase): usado pelas páginas, pelo rodapé, pelo painel e pelos testes.
//
// Regra pública: a página só existe (200) e só aparece no rodapé quando está
// PUBLICADA. Publicada com corpo: o texto do painel. Publicada sem corpo: o
// texto preliminar que já existia no código (versão preliminar, em revisão
// pela ABTE). Sem documento ou não publicada: 404 e fora do rodapé. O painel
// não gera texto jurídico: páginas novas começam sem corpo e não publicadas.
import { LIMITE_DE_CARACTERES } from "../markdownRestrito.ts";

export const COLECAO_DE_PAGINAS = "paginasInstitucionais";
export const ETIQUETA_DAS_PAGINAS = "paginas-institucionais";
export const LIMITE_DO_TITULO_DA_PAGINA = 120;

export const PAGINAS_INSTITUCIONAIS = [
  { slug: "acessibilidade", tituloPadrao: "Declaração de acessibilidade" },
  { slug: "politica-de-privacidade", tituloPadrao: "Política de privacidade" },
  { slug: "termos-de-uso", tituloPadrao: "Termos de uso" },
] as const;

export type SlugDePagina = (typeof PAGINAS_INSTITUCIONAIS)[number]["slug"];

export type PaginaInstitucional = {
  slug: SlugDePagina;
  titulo: string;
  // Markdown restrito, o mesmo dos posts (lerMarkdownRestrito e o componente
  // MarkdownRestrito: nada de HTML vindo do texto).
  corpo: string;
  publicada: boolean;
  // ISO 8601; null quando nunca foi salva.
  atualizadaEm: string | null;
};

export function ehSlugDePagina(valor: unknown): valor is SlugDePagina {
  return PAGINAS_INSTITUCIONAIS.some((pagina) => pagina.slug === valor);
}

export function caminhoDaPagina(slug: SlugDePagina): string {
  return `/${slug}`;
}

// Leitura tolerante de um documento (ausente: rascunho vazio).
export function lerPaginaInstitucional(slug: SlugDePagina, dados: unknown, atualizadaEm: string | null = null): PaginaInstitucional {
  const campos = dados && typeof dados === "object" ? (dados as Record<string, unknown>) : {};
  const padrao = PAGINAS_INSTITUCIONAIS.find((pagina) => pagina.slug === slug)?.tituloPadrao ?? slug;
  const titulo = typeof campos.titulo === "string" && campos.titulo.trim() ? campos.titulo.trim().slice(0, LIMITE_DO_TITULO_DA_PAGINA) : padrao;
  const corpo = typeof campos.corpo === "string" ? campos.corpo.slice(0, LIMITE_DE_CARACTERES) : "";
  return { slug, titulo, corpo, publicada: campos.publicada === true, atualizadaEm };
}

// A página aparece no site (rota 200 e link no rodapé)?
export function paginaNoSite(pagina: PaginaInstitucional | undefined): boolean {
  return Boolean(pagina?.publicada);
}

// O que a página pública mostra: o corpo do painel ou, sem ele, o texto
// preliminar do código.
export function conteudoDaPagina(pagina: PaginaInstitucional): "painel" | "preliminar" {
  return pagina.corpo.trim() ? "painel" : "preliminar";
}

// "30/10/2026" para "Atualizado em".
export function dataDaAtualizacao(iso: string | null): string | null {
  if (!iso) return null;
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export type CampoDaPagina = "titulo" | "corpo" | "publicada";

// Formulário de /admin/paginas/[slug]. Erros em português, por campo.
export function lerPaginaDoFormulario(campos: { slug: unknown; titulo: unknown; corpo: unknown; publicada: unknown }):
  | { ok: true; slug: SlugDePagina; dados: { titulo: string; corpo: string; publicada: boolean } }
  | { ok: false; erros: Partial<Record<CampoDaPagina, string>>; mensagem: string } {
  if (!ehSlugDePagina(campos.slug)) return { ok: false, erros: {}, mensagem: "Página não encontrada. Recarregue a página." };
  const erros: Partial<Record<CampoDaPagina, string>> = {};
  const titulo = typeof campos.titulo === "string" ? campos.titulo.trim().replace(/\s+/g, " ") : "";
  if (!titulo) erros.titulo = "Escreva o título da página.";
  else if (titulo.length > LIMITE_DO_TITULO_DA_PAGINA) erros.titulo = `O título aceita no máximo ${LIMITE_DO_TITULO_DA_PAGINA} caracteres.`;
  const corpo = typeof campos.corpo === "string" ? campos.corpo.replace(/\r\n?/g, "\n").trim() : "";
  if (corpo.length > LIMITE_DE_CARACTERES) erros.corpo = `O texto aceita no máximo ${LIMITE_DE_CARACTERES.toLocaleString("pt-BR")} caracteres.`;
  if (campos.publicada !== null && campos.publicada !== undefined && campos.publicada !== "sim") erros.publicada = "Não foi possível ler a escolha de publicar. Recarregue a página.";
  if (Object.keys(erros).length > 0) return { ok: false, erros, mensagem: "Confira os campos marcados." };
  return { ok: true, slug: campos.slug, dados: { titulo, corpo, publicada: campos.publicada === "sim" } };
}

// Nomes (sem valores) do que mudou, para o registro de alterações.
export function camposAlteradosDaPagina(antes: PaginaInstitucional | null, depois: { titulo: string; corpo: string; publicada: boolean }): string[] {
  const alterados: string[] = [];
  if (!antes || antes.titulo !== depois.titulo) alterados.push("titulo");
  if ((antes?.corpo ?? "") !== depois.corpo) alterados.push("corpo");
  if ((antes?.publicada ?? false) !== depois.publicada) alterados.push("publicada");
  return alterados;
}
