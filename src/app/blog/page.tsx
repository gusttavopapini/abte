import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { CardPost } from "@/components/CardPost/CardPost";
import estilos from "./page.module.css";
import { firestoreAdmin } from "@/lib/firebase/servidor";

export const metadata = { title: "Blog | ABTE" };

// Opt-out of static rendering if you want real-time updates without redeploy:
export const dynamic = "force-dynamic";

export default async function PaginaBlog() {
  const db = firestoreAdmin();
  const snapshot = await db.collection("posts")
    .orderBy("criadoEm", "desc")
    .get();

  const posts = snapshot.docs
    .map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        titulo: data.titulo || "Sem título",
        slug: data.slug || doc.id,
        resumo: data.conteudo ? data.conteudo.substring(0, 120) + "..." : "",
        imagemUrl: data.imagem || "https://placehold.co/600x400/e2e8f0/1e3a8a",
        status: data.status,
      };
    })
    .filter(post => post.status === "publicado");

  return (
    <LayoutPublico header="solida">
      <main className={estilos.secao}>
        <div className={`container ${estilos.container}`}>
          <div className={estilos.cabecalho}>
            <h1 className={`tipo-h1 ${estilos.titulo}`}>Blog da ABTE</h1>
            <p className={`tipo-texto-lg ${estilos.descricao}`}>
              Este é o espaço para oferecermos artigos, guias e materiais valiosos. Ajude a espalhar conhecimento verdadeiro e com base científica sobre a escoliose.
            </p>
          </div>

          <div className={estilos.grade}>
            {posts.length === 0 ? (
              <p style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 0", opacity: 0.6 }}>Nenhum post publicado ainda.</p>
            ) : (
              posts.map((post) => (
                <CardPost 
                  key={post.id}
                  titulo={post.titulo}
                  resumo={post.resumo}
                  imagemUrl={post.imagemUrl}
                  slug={post.slug}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </LayoutPublico>
  );
}
