import { notFound } from "next/navigation";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { Botao } from "@/components/Botao/Botao";
import estilos from "./page.module.css";
import { lerArtigos } from "@/lib/dados/colecoes";

export default async function PaginaLeituraArtigo({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Procura primeiro pelo id do documento e, se não achar, pelo campo slug.
  let artigo = (await lerArtigos().doc(slug).get()).data();
  if (!artigo) {
    const consulta = await lerArtigos().where("slug", "==", slug).limit(1).get();
    artigo = consulta.docs[0]?.data();
  }

  // Inexistente ou rascunho: página não encontrada.
  if (!artigo || artigo.status !== "publicado") notFound();

  const dataFormatada = artigo.criadoEm ? artigo.criadoEm.toLocaleDateString("pt-BR") : "";

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
              <div className={estilos.meta}>
                {dataFormatada && <span className={estilos.data}>{dataFormatada}</span>}
                <span className={estilos.separador}>•</span>
                <span className={estilos.autor}>por {artigo.autores || "Autor Desconhecido"}</span>
              </div>
            </header>

            <div className={`tipo-texto ${estilos.conteudo} ${estilos.textoCorrido}`}>
              {artigo.resumo}
            </div>
            
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
