import type { Post } from "./dados/tipos.ts";
import { lerMarkdownRestrito, textoDoMarkdown } from "./markdownRestrito.ts";

export const LIMITE_DA_BUSCA = 100;

// O Next.js já decodifica a URL; parâmetros repetidos usam o primeiro valor.
export function lerTermoDeBusca(valor: string | string[] | undefined): string {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return (texto ?? "").replace(/\s+/g, " ").trim().slice(0, LIMITE_DA_BUSCA);
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type CamposDaBusca = Pick<Post, "titulo" | "resumo" | "conteudo" | "formatoConteudo">;

// Recebe apenas a lista pública. Todos os termos devem aparecer no título,
// resumo ou texto completo, sem diferença de maiúsculas ou acentos.
export function filtrarPostsPorBusca<T extends CamposDaBusca>(posts: T[], busca: string): T[] {
  const termos = normalizar(busca).split(/\s+/).filter(Boolean);
  if (!termos.length) return posts;

  return posts.filter((post) => {
    const conteudo = post.formatoConteudo === "markdown"
      ? textoDoMarkdown(lerMarkdownRestrito(post.conteudo)).join(" ")
      : post.conteudo;
    const texto = normalizar(`${post.titulo} ${post.resumo} ${conteudo}`);
    return termos.every((termo) => texto.includes(termo));
  });
}

// Links dos filtros e de limpar preservam o outro filtro, com URL codificada.
export function enderecoDoBlog(categoria?: string, busca?: string): string {
  const parametros = new URLSearchParams();
  if (categoria) parametros.set("categoria", categoria);
  if (busca) parametros.set("busca", busca);
  const consulta = parametros.toString();
  return consulta ? `/blog?${consulta}` : "/blog";
}
