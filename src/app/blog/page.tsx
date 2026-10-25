import Link from "next/link";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { CardPost } from "@/components/CardPost/CardPost";
import estilos from "./page.module.css";
import { lerPosts, listarTopicosAtivos, ordenarPosts } from "@/lib/dados/colecoes";
import { categoriaDoFiltro, categoriasComPublicados } from "@/lib/topicos";
import type { Post } from "@/lib/dados/tipos";
import { lerMarkdownRestrito, textoDoMarkdown } from "@/lib/markdownRestrito";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import { capaParaExibir } from "@/lib/capaDoPost";
import { revelar } from "@/components/Revelar/revelar";

export const metadata = { title: "Blog" };

// Sempre lê o Firestore na hora: um post publicado aparece sem novo deploy.
export const dynamic = "force-dynamic";

// Resumo do card: o gravado no post; sem ele, o começo do texto (no Markdown
// restrito, o texto sem a marcação).
function resumoDoPost(post: Post): string {
  if (post.resumo) return post.resumo;
  const texto = post.formatoConteudo === "markdown" ? textoDoMarkdown(lerMarkdownRestrito(post.conteudo)).join(" ") : post.conteudo;
  return texto ? texto.substring(0, 120) + "..." : "";
}

export default async function PaginaBlog({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  // Coleção pequena: ordenada na memória pela data de publicação original
  // (posts importados) ou, sem ela, pela criação.
  const [snapshot, categorias] = await Promise.all([lerPosts().get(), listarTopicosAtivos("categoriaDePost")]);

  const todosPublicados = ordenarPosts(snapshot.docs.map((documento) => documento.data()).filter((post) => post.status === "publicado"));
  // Filtros: categorias ativas com post publicado (lib/topicos.ts). Slug
  // desconhecido ou de categoria oculta mostra todos.
  const filtros = categoriasComPublicados(categorias, todosPublicados);
  const filtro = categoriaDoFiltro(filtros, (await searchParams).categoria);
  const publicados = filtro ? todosPublicados.filter((post) => post.categoria === filtro.id) : todosPublicados;
  // Capas fora da lixeira da biblioteca; com capaMidiaId sem imagem, placeholder.
  const capas = await imagensAtivasPorId(publicados.map((post) => post.capaMidiaId));

  const posts = publicados.map((post) => {
    // Regra em lib/capaDoPost.ts; sem imagem, o card mostra o placeholder interno.
    const capa = capaParaExibir(post, post.capaMidiaId ? capas.get(post.capaMidiaId) : undefined, "lista");
    return {
      id: post.id,
      titulo: post.titulo || "Sem título",
      slug: post.slug || post.id,
      resumo: resumoDoPost(post),
      capa: capa.tipo === "biblioteca" ? capa.imagem : null,
      imagemUrl: capa.tipo === "antiga" ? capa.endereco : undefined,
    };
  });

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

          {filtros.length > 0 && (
            <nav aria-label="Categorias do blog" className={estilos.filtros}>
              <ul role="list" className={estilos.listaDeFiltros}>
                <li>
                  <Link href="/blog" className={estilos.filtro} aria-current={filtro ? undefined : "page"}>Todos</Link>
                </li>
                {filtros.map((categoria) => (
                  <li key={categoria.id}>
                    <Link href={`/blog?categoria=${categoria.slug}`} className={estilos.filtro} aria-current={filtro?.id === categoria.id ? "page" : undefined}>
                      {categoria.nome}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div {...revelar("grade-de-cards")}>
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
