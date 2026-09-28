import { notFound } from "next/navigation";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { Botao } from "@/components/Botao/Botao";
import estilos from "./page.module.css";
import { firestoreAdmin } from "@/lib/firebase/servidor";

type ArtigoData = {
  titulo?: string;
  resumo?: string;
  autores?: string;
  link?: string;
  status?: string;
  criadoEm?: { toDate?: () => Date };
};

export default async function PaginaLeituraArtigo({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const db = firestoreAdmin();
  
  let doc = await db.collection("artigos").doc(resolvedParams.slug).get();
  
  if (!doc.exists) {
    const querySnapshot = await db.collection("artigos").where("slug", "==", resolvedParams.slug).limit(1).get();
    if (!querySnapshot.empty) {
      doc = querySnapshot.docs[0];
    }
  }

  if (!doc.exists) {
    notFound();
  }

  const artigo = doc.data() as ArtigoData;
  if (artigo.status !== "publicado") {
    notFound(); // Se for rascunho, não exibe
  }

  let dataFormatada = "";
  if (artigo.criadoEm?.toDate) {
    dataFormatada = artigo.criadoEm.toDate().toLocaleDateString("pt-BR");
  }

  return (
    <LayoutPublico header="solida">
      <main className={estilos.secao}>
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

            <div className={`tipo-texto ${estilos.conteudo}`} style={{ whiteSpace: "pre-wrap", marginBottom: "var(--space-32)" }}>
              {artigo.resumo}
            </div>
            
            {artigo.link && (
              <div style={{ marginTop: "var(--space-24)" }}>
                <Botao href={artigo.link} target="_blank" rel="noopener noreferrer">
                  Acessar Artigo Original
                </Botao>
              </div>
            )}
          </article>
        </div>
      </main>
    </LayoutPublico>
  );
}
