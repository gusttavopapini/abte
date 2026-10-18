import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { Botao } from "@/components/Botao/Botao";
import estilos from "./page.module.css";
import { ehIdDeDocumentoValido } from "@/lib/validacao";
import { lerPosts } from "@/lib/dados/colecoes";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";

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

  const dataFormatada = post.criadoEm ? post.criadoEm.toLocaleDateString("pt-BR") : "";
  // Capa da biblioteca (vence); sem ela, a capa antiga digitada; sem nenhuma,
  // ou com a imagem da biblioteca na lixeira, o placeholder interno.
  const capa = post.capaMidiaId ? (await imagensAtivasPorId([post.capaMidiaId])).get(post.capaMidiaId) ?? null : null;
  const capaAntiga = post.capaMidiaId ? "" : post.imagem;

  return (
    <LayoutPublico header="solida">
      <div className={estilos.secao}>
        <div className={`container ${estilos.container}`}>
          <div className={estilos.voltar}>
             <Botao href="/blog" variante="link">
               &larr; Voltar para o Blog
             </Botao>
          </div>

          <article className={estilos.post}>
            <header className={estilos.cabecalho}>
              <h1 className={`tipo-h1 ${estilos.titulo}`}>{post.titulo}</h1>
              <div className={estilos.meta}>
                {dataFormatada && <span className={estilos.data}>{dataFormatada}</span>}
                <span className={estilos.autor}>ABTE</span>
              </div>
            </header>

            <div style={{ marginBottom: "var(--space-32)", borderRadius: "8px", overflow: "hidden" }}>
              {capa ? (
                <ImagemDaMidia
                  variantes={capa.variantes}
                  alt={capa.alt}
                  largura={capa.largura}
                  altura={capa.altura}
                  sizes="(max-width: 800px) 100vw, 800px"
                  prioridade
                  className={estilos.imagemDeCapa}
                />
              ) : capaAntiga ? (
                <img src={capaAntiga} alt={post.titulo} className={estilos.imagemDeCapa} />
              ) : (
                <PlaceholderImagem />
              )}
            </div>

            <div className={`tipo-texto ${estilos.conteudo} ${estilos.textoCorrido}`}>
              {post.conteudo}
            </div>
          </article>
        </div>
      </div>
    </LayoutPublico>
  );
}
