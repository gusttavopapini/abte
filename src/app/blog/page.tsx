import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { CardPost } from "@/components/CardPost/CardPost";
import estilos from "./page.module.css";
import { lerPosts } from "@/lib/dados/colecoes";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import { revelar } from "@/components/Revelar/revelar";

export const metadata = { title: "Blog" };

// Sempre lê o Firestore na hora: um post publicado aparece sem novo deploy.
export const dynamic = "force-dynamic";

export default async function PaginaBlog() {
  const snapshot = await lerPosts().orderBy("criadoEm", "desc").get();

  const publicados = snapshot.docs.map((documento) => documento.data()).filter((post) => post.status === "publicado");
  // Capas fora da lixeira da biblioteca; com capaMidiaId sem imagem, placeholder.
  const capas = await imagensAtivasPorId(publicados.map((post) => post.capaMidiaId));

  const posts = publicados.map((post) => ({
    id: post.id,
    titulo: post.titulo || "Sem título",
    slug: post.slug || post.id,
    resumo: post.conteudo ? post.conteudo.substring(0, 120) + "..." : "",
    capa: post.capaMidiaId ? capas.get(post.capaMidiaId) ?? null : null,
    // A capa antiga só vale enquanto o post não tem capa da biblioteca.
    imagemUrl: post.capaMidiaId ? undefined : post.imagem || undefined,
  }));

  return (
    <LayoutPublico header="solida">
      <div className={estilos.secao}>
        <div className={`container ${estilos.container}`}>
          <div className={estilos.cabecalho}>
            <h1 className={`tipo-h1 ${estilos.titulo}`}>Blog da ABTE</h1>
            <p className={`tipo-texto-lg ${estilos.descricao}`}>
              Este é o espaço para oferecermos artigos, guias e materiais valiosos. Ajude a espalhar conhecimento verdadeiro e com base científica sobre a escoliose.
            </p>
          </div>

          <div {...revelar(estilos.grade)}>
            {posts.length === 0 ? (
              <p style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 0", opacity: 0.6 }}>Nenhum post publicado ainda.</p>
            ) : (
              posts.map((post) => (
                <CardPost 
                  key={post.id}
                  titulo={post.titulo}
                  resumo={post.resumo}
                  capa={post.capa}
                  imagemUrl={post.imagemUrl}
                  slug={post.slug}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </LayoutPublico>
  );
}
