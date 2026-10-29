import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { Botao } from "@/components/Botao/Botao";
import estilos from "./page.module.css";
import { ehIdDeDocumentoValido } from "@/lib/validacao";
import { lerArtigos, lerTopicos } from "@/lib/dados/colecoes";
import type { Topico } from "@/lib/dados/tipos";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";

// Artigo publicado pelo id do documento ou, se não achar, pelo campo slug.
// Um endereço que não pode ser id (ex.: __x__) vai direto para o slug: o
// Firestore recusaria a leitura e a página daria erro 500 em vez de 404.
// O cache evita ler duas vezes (metadata e página).
const lerArtigoPublicado = cache(async (slug: string) => {
  let artigo = ehIdDeDocumentoValido(slug) ? (await lerArtigos().doc(slug).get()).data() : undefined;
  if (!artigo) {
    const consulta = await lerArtigos().where("slug", "==", slug).limit(1).get();
    artigo = consulta.docs[0]?.data();
  }
  // Rascunho conta como inexistente.
  return artigo?.status === "publicado" ? artigo : null;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const artigo = await lerArtigoPublicado((await params).slug);
  if (!artigo) return { title: "Página não encontrada" };
  return { title: artigo.titulo };
}

export default async function PaginaLeituraArtigo({ params }: { params: Promise<{ slug: string }> }) {
  const artigo = await lerArtigoPublicado((await params).slug);
  if (!artigo) notFound();

  // Imagem da biblioteca, só nesta página (o card da lista é só texto, como no
  // design). Sem imagem, ou com ela na lixeira, nenhum bloco de imagem.
  const imagem = artigo.imagemMidiaId ? (await imagensAtivasPorId([artigo.imagemMidiaId])).get(artigo.imagemMidiaId) : undefined;

  // Tags do artigo, na ordem do nome; as que estão na lixeira não aparecem.
  const colecaoDeTags = lerTopicos("tag");
  const tags = artigo.tags.length
    ? (await colecaoDeTags.firestore.getAll(...artigo.tags.map((id) => colecaoDeTags.doc(id))))
        .map((documento) => documento.data())
        .filter((tag): tag is Topico => tag !== undefined && !tag.excluidoEm)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    : [];

  return (
    <LayoutPublico header="solida">
      <div className={estilos.secao}>
        <div className={`container ${estilos.container}`}>
          <div className={estilos.voltar}>
             <Botao href="/artigos" variante="link">
               &larr; Voltar para Artigos
             </Botao>
          </div>

          <article className={estilos.artigo}>
            <header className={estilos.cabecalho}>
              <h1 className={`tipo-h1 ${estilos.titulo}`}>{artigo.titulo}</h1>
              {/* Sem data: a gravada é a da importação, não a do artigo; sem
                  autores, a linha não aparece (29/10/2026). */}
              {artigo.autores && <p className={estilos.meta}>por {artigo.autores}</p>}
              {tags.length > 0 && (
                <ul role="list" aria-label="Tags do artigo" className={estilos.tags}>
                  {tags.map((tag) => (
                    <li key={tag.id} className={estilos.tag}>{tag.nome}</li>
                  ))}
                </ul>
              )}
            </header>

            {imagem && (
              <div className={estilos.imagem}>
                <ImagemDaMidia
                  variantes={imagem.variantes}
                  alt={imagem.alt}
                  largura={imagem.largura}
                  altura={imagem.altura}
                  sizes="(max-width: 800px) 100vw, 800px"
                  prioridade
                />
              </div>
            )}

            {artigo.resumo && (
              <div className={`tipo-texto ${estilos.conteudo} ${estilos.textoCorrido}`}>
                {artigo.resumo}
              </div>
            )}

            {artigo.link && (
              <div className={estilos.linkOriginal}>
                <Botao href={artigo.link} target="_blank" rel="noopener noreferrer">
                  Acessar Artigo Original
                </Botao>
              </div>
            )}
          </article>
        </div>
      </div>
    </LayoutPublico>
  );
}
