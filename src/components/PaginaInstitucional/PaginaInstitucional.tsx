import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { MarkdownRestrito } from "@/components/MarkdownRestrito/MarkdownRestrito";
import { PaginaDeTexto } from "@/components/PaginaDeTexto/PaginaDeTexto";
import { lerPaginasEmCache } from "@/lib/dados/paginas";
import { lerMarkdownRestrito } from "@/lib/markdownRestrito";
import { conteudoDaPagina, dataDaAtualizacao, paginaNoSite, type SlugDePagina } from "@/lib/site/paginas";

// Página institucional pública (30/10/2026): só existe quando publicada no
// painel (/admin/paginas); senão, 404. Com corpo, o texto do painel em
// Markdown restrito e "Atualizado em"; publicada sem corpo, o texto
// preliminar que já existia no código.
export async function PaginaInstitucional({ slug, preliminar }: { slug: SlugDePagina; preliminar: ReactNode }) {
  const pagina = (await lerPaginasEmCache()).get(slug);
  if (!pagina || !paginaNoSite(pagina)) notFound();
  if (conteudoDaPagina(pagina) === "preliminar") return preliminar;
  const data = dataDaAtualizacao(pagina.atualizadaEm);
  return (
    <PaginaDeTexto titulo={pagina.titulo} introducao={data ? <p>Atualizado em {data}</p> : null}>
      <MarkdownRestrito blocos={lerMarkdownRestrito(pagina.corpo)} imagens={new Map()} sizes="(max-width: 767px) 100vw, 824px" />
    </PaginaDeTexto>
  );
}
