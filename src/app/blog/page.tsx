import Link from "next/link";
import Form from "next/form";
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
import { enderecoDoBlog, filtrarPostsPorBusca, lerTermoDeBusca, LIMITE_DA_BUSCA } from "@/lib/buscaBlog";

export const metadata = { title: "Blog" };

// Sempre lê o Firestore na hora: um post publicado aparece sem novo deploy.
export const dynamic = "force-dynamic";

// Prévia curta só na listagem, inclusive para resumos importados. O conteúdo
// completo e o resumo gravado no banco permanecem intactos.
function resumoDoPost(post: Post): string {
  const texto = (
    post.resumo.trim() ||
    (post.formatoConteudo === "markdown" ? textoDoMarkdown(lerMarkdownRestrito(post.conteudo)).join(" ") : post.conteudo)
  ).replace(/\s+/g, " ").trim();
  if (texto.length <= 120) return texto;

  const previa = texto.slice(0, 119);
  const ultimaPalavra = previa.lastIndexOf(" ");
  return `${ultimaPalavra > 0 ? previa.slice(0, ultimaPalavra) : previa}…`;
}

export default async function PaginaBlog({ searchParams }: { searchParams: Promise<{ categoria?: string | string[]; busca?: string | string[] }> }) {
  // Coleção pequena: ordenada na memória pela data de publicação original
  // (posts importados) ou, sem ela, pela criação.
  const [snapshot, categorias] = await Promise.all([lerPosts().get(), listarTopicosAtivos("categoriaDePost")]);

  const todosPublicados = ordenarPosts(snapshot.docs.map((documento) => documento.data()).filter((post) => post.status === "publicado"));
  // Filtros: categorias ativas com post publicado (lib/topicos.ts). Slug
  // desconhecido ou de categoria oculta mostra todos.
  const filtros = categoriasComPublicados(categorias, todosPublicados);
  const parametros = await searchParams;
  const categoria = Array.isArray(parametros.categoria) ? parametros.categoria[0] : parametros.categoria;
  const filtro = categoriaDoFiltro(filtros, categoria);
  const busca = lerTermoDeBusca(parametros.busca);
  const daCategoria = filtro ? todosPublicados.filter((post) => post.categoria === filtro.id) : todosPublicados;
  const publicados = filtrarPostsPorBusca(daCategoria, busca);
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
            <Form action="/blog" role="search" aria-label="Buscar no blog" className={estilos.busca} key={`${filtro?.slug ?? "todos"}:${busca}`}>
              <label htmlFor="busca-blog" className="somente-leitor">Buscar no blog</label>
              {filtro && <input type="hidden" name="categoria" value={filtro.slug} />}
              <input
                id="busca-blog"
                name="busca"
                type="search"
                placeholder="Buscar no blog"
                defaultValue={busca}
                maxLength={LIMITE_DA_BUSCA}
                className={estilos.campoBusca}
              />
              <button type="submit" className={estilos.botaoBusca} aria-label="Buscar publicações">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m16 16 5 5" />
                </svg>
              </button>
            </Form>
          </div>

          {filtros.length > 0 && (
            <nav aria-label="Categorias do blog" className={estilos.filtros}>
              <ul role="list" className={estilos.listaDeFiltros}>
                <li>
                  <Link href={enderecoDoBlog(undefined, busca)} className={estilos.filtro} aria-current={filtro ? undefined : "page"}>Todos</Link>
                </li>
                {filtros.map((categoria) => (
                  <li key={categoria.id}>
                    <Link href={enderecoDoBlog(categoria.slug, busca)} className={estilos.filtro} aria-current={filtro?.id === categoria.id ? "page" : undefined}>
                      {categoria.nome}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {busca && (
            <div className={estilos.resultadoBusca} role="status">
              <p>{posts.length} {posts.length === 1 ? "publicação encontrada" : "publicações encontradas"} para “{busca}”.</p>
              <Link href={enderecoDoBlog(filtro?.slug)} className={estilos.limparBusca}>Limpar busca</Link>
            </div>
          )}

          <div {...revelar("grade-de-cards")}>
            {posts.length === 0 ? (
              <p className={estilos.vazio}>
                {busca ? "Nenhuma publicação corresponde à busca. Tente outra palavra ou escolha outra categoria." : "Nenhum post publicado ainda."}
              </p>
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
