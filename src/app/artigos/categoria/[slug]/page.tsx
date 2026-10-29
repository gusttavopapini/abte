import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { CardArtigo } from "@/components/CardArtigo/CardArtigo";
import { Botao } from "@/components/Botao/Botao";
import { CabecalhoDePagina } from "@/components/CabecalhoDePagina/CabecalhoDePagina";
import { lerArtigos, lerTopicos } from "@/lib/dados/colecoes";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import { categoriaDaPaginaPublica } from "@/lib/topicos";
import estilos from "./page.module.css";
import { revelar } from "@/components/Revelar/revelar";

export const dynamic = "force-dynamic";

// Categoria cadastrada no painel, pelo slug; inativa ou na lixeira conta
// como inexistente (404, desde 23/10/2026 também a inativa).
// O cache evita ler duas vezes (metadata e página) na mesma requisição.
const lerCategoria = cache(async (slug: string) => {
  const consulta = await lerTopicos("categoria").where("slug", "==", slug).limit(1).get();
  return categoriaDaPaginaPublica(consulta.docs[0]?.data());
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const categoria = await lerCategoria((await params).slug);
  return { title: categoria ? `Artigos sobre ${categoria.nome}` : "Categoria não encontrada" };
}

export default async function PaginaCategoriaArtigos({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categoria = await lerCategoria(slug);

  if (!categoria) {
    notFound();
  }

  // Só artigos publicados desta categoria, do mais novo para o mais antigo.
  // Ordenados aqui para não depender de índice composto no Firestore.
  const snapshot = await lerArtigos().where("categoria", "==", categoria.id).get();
  const artigos = snapshot.docs
    .map((documento) => documento.data())
    .filter((artigo) => artigo.status === "publicado")
    .sort((a, b) => (b.criadoEm?.getTime() ?? 0) - (a.criadoEm?.getTime() ?? 0));
  const imagens = await imagensAtivasPorId(artigos.map((artigo) => artigo.imagemMidiaId));

  return (
    <LayoutPublico header="solida">
      <div className={estilos.secao}>
        <div className="container pagina-interna">
          <div className={estilos.voltar}>
            <Botao href="/artigos" variante="link">
              &larr; Voltar para Artigos
            </Botao>
          </div>
          <CabecalhoDePagina titulo={`Artigos sobre ${categoria.nome}`} descricao="Explorando os artigos e publicações classificados nesta categoria." />

          <div {...revelar("grade-de-cards")}>
            {artigos.length === 0 ? (
              <p className={`tipo-texto ${estilos.vazio}`}>Nenhum artigo publicado nesta categoria ainda.</p>
            ) : (
              artigos.map((artigo) => (
                <CardArtigo
                  key={artigo.id}
                  titulo={artigo.titulo || "Sem título"}
                  autores={artigo.autores}
                  resumo={artigo.resumo}
                  imagem={artigo.imagemMidiaId ? imagens.get(artigo.imagemMidiaId) ?? null : null}
                  slug={artigo.id}
                  nivelDoTitulo={2}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </LayoutPublico>
  );
}
