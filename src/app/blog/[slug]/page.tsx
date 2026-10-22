import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { Botao } from "@/components/Botao/Botao";
import estilos from "./page.module.css";
import { ehIdDeDocumentoValido } from "@/lib/validacao";
import { dataDoPost, lerPosts } from "@/lib/dados/colecoes";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import { capaParaExibir } from "@/lib/capaDoPost";
import { lerMarkdownRestrito, midiasDoMarkdown } from "@/lib/markdownRestrito";
import { MarkdownRestrito } from "@/components/MarkdownRestrito/MarkdownRestrito";

// Largura das imagens do conteúdo (a coluna do post tem até 800 px).
const LARGURA_DAS_IMAGENS = "(max-width: 800px) 100vw, 800px";

// Post publicado pelo id do documento ou, se não achar, pelo campo slug.
// Um endereço que não pode ser id (ex.: __x__) vai direto para o slug: o
// Firestore recusaria a leitura e a página daria erro 500 em vez de 404.
// O cache evita ler duas vezes (metadata e página).
const lerPostPublicado = cache(async (slug: string) => {
  let post = ehIdDeDocumentoValido(slug) ? (await lerPosts().doc(slug).get()).data() : undefined;
  if (!post) {
    const consulta = await lerPosts().where("slug", "==", slug).limit(1).get();
    post = consulta.docs[0]?.data();
  }
  // Rascunho conta como inexistente.
  return post?.status === "publicado" ? post : null;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await lerPostPublicado((await params).slug);
  if (!post) return { title: "Página não encontrada" };
  return { title: post.titulo };
}

export default async function PaginaPost({ params }: { params: Promise<{ slug: string }> }) {
  const post = await lerPostPublicado((await params).slug);
  if (!post) notFound();

  const data = dataDoPost(post);
  const dataFormatada = data ? data.toLocaleDateString("pt-BR") : "";
  // Markdown restrito (posts importados) ou texto puro (posts do painel).
  const blocos = post.formatoConteudo === "markdown" ? lerMarkdownRestrito(post.conteudo) : null;
  // Capa e imagens do conteúdo numa leitura só; só as fora da lixeira.
  const imagens = await imagensAtivasPorId([post.capaMidiaId, ...(blocos ? midiasDoMarkdown(blocos) : [])]);
  // Regra em lib/capaDoPost.ts; sem imagem, a página não tem bloco de capa.
  const capa = capaParaExibir(post, post.capaMidiaId ? imagens.get(post.capaMidiaId) : undefined, "pagina");

  return (
    <LayoutPublico header="solida">
      <div className={estilos.secao}>
        <div className={`container ${estilos.container}`}>
          <div className={estilos.voltar}>
             <Botao href="/blog" variante="link">
               &larr; Voltar para o Blog
             </Botao>
          </div>

          <article className={estilos.post} lang={post.idioma}>
            <header className={estilos.cabecalho}>
              <h1 className={`tipo-h1 ${estilos.titulo}`}>{post.titulo}</h1>
              <div className={estilos.meta}>
                {dataFormatada && <span className={estilos.data}>{dataFormatada}</span>}
                <span className={estilos.autor}>ABTE</span>
              </div>
            </header>

            {capa.tipo !== "nenhuma" && capa.tipo !== "placeholder" && (
              <div style={{ marginBottom: "var(--space-32)", borderRadius: "8px", overflow: "hidden" }}>
                {capa.tipo === "biblioteca" ? (
                  <ImagemDaMidia
                    variantes={capa.imagem.variantes}
                    alt={capa.imagem.alt}
                    largura={capa.imagem.largura}
                    altura={capa.imagem.altura}
                    sizes={LARGURA_DAS_IMAGENS}
                    prioridade
                    className={estilos.imagemDeCapa}
                  />
                ) : (
                  <img src={capa.endereco} alt={post.titulo} className={estilos.imagemDeCapa} />
                )}
              </div>
            )}

            {blocos ? (
              <div className={`tipo-texto ${estilos.conteudo}`}>
                <MarkdownRestrito blocos={blocos} imagens={imagens} sizes={LARGURA_DAS_IMAGENS} />
              </div>
            ) : (
              <div className={`tipo-texto ${estilos.conteudo} ${estilos.textoCorrido}`}>
                {post.conteudo}
              </div>
            )}
          </article>
        </div>
      </div>
    </LayoutPublico>
  );
}
