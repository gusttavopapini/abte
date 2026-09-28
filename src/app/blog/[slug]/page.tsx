import { notFound } from "next/navigation";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { Botao } from "@/components/Botao/Botao";
import estilos from "./page.module.css";
import { firestoreAdmin } from "@/lib/firebase/servidor";

type PostData = {
  titulo?: string;
  conteudo?: string;
  imagem?: string;
  status?: string;
  criadoEm?: { toDate?: () => Date };
};

export default async function PaginaPost({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const db = firestoreAdmin();
  
  let doc = await db.collection("posts").doc(resolvedParams.slug).get();
  
  if (!doc.exists) {
    const querySnapshot = await db.collection("posts").where("slug", "==", resolvedParams.slug).limit(1).get();
    if (!querySnapshot.empty) {
      doc = querySnapshot.docs[0];
    }
  }

  if (!doc.exists) {
    notFound();
  }

  const post = doc.data() as PostData;
  if (post.status !== "publicado") {
    notFound(); // Se for rascunho, não exibe
  }

  let dataFormatada = "";
  if (post.criadoEm?.toDate) {
    dataFormatada = post.criadoEm.toDate().toLocaleDateString("pt-BR");
  }

  return (
    <LayoutPublico header="solida">
      <main className={estilos.secao}>
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

            {post.imagem && (
              <div style={{ marginBottom: "var(--space-32)", borderRadius: "8px", overflow: "hidden" }}>
                <img src={post.imagem} alt={post.titulo} style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
            )}

            <div className={`tipo-texto ${estilos.conteudo}`} style={{ whiteSpace: "pre-wrap" }}>
              {post.conteudo}
            </div>
          </article>
        </div>
      </main>
    </LayoutPublico>
  );
}
