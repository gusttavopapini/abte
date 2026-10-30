import { notFound } from "next/navigation";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { lerConfiguracaoDoSiteEmCache } from "@/lib/dados/site";
import { CardCategoriaArtigo } from "@/components/CardCategoriaArtigo/CardCategoriaArtigo";
import { CardArtigo } from "@/components/CardArtigo/CardArtigo";
import estilos from "./page.module.css";
import { CabecalhoDePagina } from "@/components/CabecalhoDePagina/CabecalhoDePagina";
import { lerArtigos, listarTopicosAtivos } from "@/lib/dados/colecoes";
import { categoriasComPublicados } from "@/lib/topicos";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import { revelar } from "@/components/Revelar/revelar";

export const metadata = { title: "Artigos Científicos" };
export const dynamic = "force-dynamic";

export default async function PaginaArtigos() {
  // Artigos fora do site (configuracoes/site, 30/10/2026): 404.
  if (!(await lerConfiguracaoDoSiteEmCache()).artigosAtivo) notFound();
  // Categorias cadastradas no painel ("Tópicos dos artigos"): só as ativas,
  // fora da lixeira e com pelo menos um artigo publicado (desde 25/10/2026),
  // com a imagem da biblioteca; sem imagem, o card usa o placeholder.
  const [snapshot, todasAsCategorias] = await Promise.all([lerArtigos().orderBy("criadoEm", "desc").get(), listarTopicosAtivos("categoria")]);
  const categorias = categoriasComPublicados(
    todasAsCategorias,
    snapshot.docs.map((documento) => documento.data()).filter((artigo) => artigo.status === "publicado"),
  );
  // Artigos publicados, do mais novo para o mais antigo no site. O card não
  // mostra data: a gravada é a da importação, não a do artigo (29/10/2026).
  const publicados = snapshot.docs.map((documento) => documento.data()).filter((artigo) => artigo.status === "publicado");
  const imagens = await imagensAtivasPorId([
    ...categorias.map((categoria) => categoria.imagemMidiaId),
    ...publicados.map((artigo) => artigo.imagemMidiaId),
  ]);
  const artigos = publicados.map((artigo) => ({
    id: artigo.id,
    titulo: artigo.titulo || "Sem título",
    resumo: artigo.resumo,
    autores: artigo.autores,
    imagem: artigo.imagemMidiaId ? imagens.get(artigo.imagemMidiaId) ?? null : null,
    slug: artigo.id,
  }));

  return (
    <LayoutPublico header="solida">
      <div>
        
        {/* Abertura da página: cabeçalho centralizado, sem a imagem
            decorativa (29/10/2026) */}
        <section className={`pagina-interna ${estilos.hero}`}>
          <div className="container">
            <CabecalhoDePagina
              titulo="Artigos Científicos"
              descricao="Acesse nosso acervo de publicações científicas, pesquisas e estudos de caso para aprofundar seu conhecimento sobre o tratamento da escoliose."
              espacoAbaixo={false}
            />
          </div>
        </section>

        {/* Navegar por categoria */}
        <section className={estilos.bloco}>
          <div className="container">
            <header {...revelar(estilos.blocoCabecalho)}>
              <span className={estilos.blocoMarcador}>Categorias</span>
              <h2 className={`tipo-h2 ${estilos.blocoTitulo}`}>Navegue por tópicos</h2>
            </header>
            
            <div {...revelar("grade-de-cards", 1)}>
              {categorias.length === 0 ? (
                <p className={`tipo-texto ${estilos.vazio}`}>Nenhum tópico cadastrado ainda.</p>
              ) : (
                categorias.map((categoria) => (
                  <CardCategoriaArtigo
                    key={categoria.id}
                    nome={categoria.nome}
                    slug={categoria.slug}
                    imagem={categoria.imagemMidiaId ? imagens.get(categoria.imagemMidiaId) ?? null : null}
                  />
                ))
              )}
            </div>
          </div>
        </section>

        {/* Artigos publicados. Antes, "Top Artigos" e "Mais lidos da semana":
            não existe contagem de leitura (29/10/2026). Fundo claro para os
            cards brancos aparecerem. */}
        <section className={estilos.bloco}>
          <div className="container">
            <header {...revelar(estilos.blocoCabecalho)}>
              <span className={estilos.blocoMarcador}>Artigos</span>
              <h2 className={`tipo-h2 ${estilos.blocoTitulo}`}>Todos os artigos</h2>
            </header>

            <div {...revelar("grade-de-cards", 1)}>
              {artigos.length === 0 ? (
                <p className={`tipo-texto ${estilos.vazio}`}>Nenhum artigo publicado ainda.</p>
              ) : (
                artigos.map((artigo) => (
                  <CardArtigo
                    key={artigo.id}
                    titulo={artigo.titulo}
                    autores={artigo.autores}
                    resumo={artigo.resumo}
                    imagem={artigo.imagem}
                    slug={artigo.slug}
                  />
                ))
              )}
            </div>
          </div>
        </section>

      </div>
    </LayoutPublico>
  );
}
