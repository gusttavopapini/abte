import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { CardCategoriaArtigo } from "@/components/CardCategoriaArtigo/CardCategoriaArtigo";
import { CardArtigo } from "@/components/CardArtigo/CardArtigo";
import estilos from "./page.module.css";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import { lerArtigos, listarTopicosAtivos } from "@/lib/dados/colecoes";
import { categoriasComPublicados } from "@/lib/topicos";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import { revelar } from "@/components/Revelar/revelar";

export const metadata = { title: "Artigos Científicos" };
export const dynamic = "force-dynamic";

export default async function PaginaArtigos() {
  // Categorias cadastradas no painel ("Tópicos dos artigos"): só as ativas,
  // fora da lixeira e com pelo menos um artigo publicado (desde 25/10/2026),
  // com a imagem da biblioteca; sem imagem, o card usa o placeholder.
  const [snapshot, todasAsCategorias] = await Promise.all([lerArtigos().orderBy("criadoEm", "desc").get(), listarTopicosAtivos("categoria")]);
  const categorias = categoriasComPublicados(
    todasAsCategorias,
    snapshot.docs.map((documento) => documento.data()).filter((artigo) => artigo.status === "publicado"),
  );
  const imagens = await imagensAtivasPorId(categorias.map((categoria) => categoria.imagemMidiaId));

  const artigos = snapshot.docs
    .map((documento) => {
      const artigo = documento.data();
      return {
        id: artigo.id,
        titulo: artigo.titulo || "Sem título",
        resumo: artigo.resumo,
        autor: artigo.autores || "Autor Desconhecido",
        data: artigo.criadoEm ? artigo.criadoEm.toLocaleDateString("pt-BR") : "",
        slug: artigo.id,
        status: artigo.status,
      };
    })
    .filter((artigo) => artigo.status === "publicado");

  return (
    <LayoutPublico header="solida">
      <div className={estilos.secao}>
        
        {/* Abertura da página */}
        <section className={estilos.hero}>
          <div className={`container ${estilos.heroGrid}`}>
            <div>
               <h1 className={`tipo-h1 ${estilos.heroTitulo}`}>Artigos Científicos</h1>
               <p className={`tipo-texto-lg ${estilos.heroDescricao}`}>
                 Acesse nosso acervo de publicações científicas, pesquisas e estudos de caso para aprofundar seu conhecimento sobre o tratamento da escoliose.
               </p>
            </div>
            <div className={estilos.heroImagemContainer}>
               <PlaceholderImagem />
            </div>
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

        {/* Artigos publicados */}
        <section className={`${estilos.bloco} ${estilos.blocoClaro}`}>
          <div className="container">
            <header {...revelar(estilos.blocoCabecalho)}>
              <span className={estilos.blocoMarcador}>Top Artigos</span>
              <h2 className={`tipo-h2 ${estilos.blocoTitulo}`}>Mais lidos da semana</h2>
            </header>

            <div {...revelar("grade-de-cards", 1)}>
              {artigos.length === 0 ? (
                <p style={{ gridColumn: "1 / -1", opacity: 0.6 }}>Nenhum artigo publicado ainda.</p>
              ) : (
                artigos.map((artigo) => (
                  <CardArtigo 
                    key={artigo.slug}
                    titulo={artigo.titulo}
                    resumo={artigo.resumo}
                    autor={artigo.autor}
                    data={artigo.data}
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
