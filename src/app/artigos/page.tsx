import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { CardCategoriaArtigo } from "@/components/CardCategoriaArtigo/CardCategoriaArtigo";
import { CardArtigo } from "@/components/CardArtigo/CardArtigo";
import estilos from "./page.module.css";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import { lerArtigos } from "@/lib/dados/colecoes";

export const metadata = { title: "Artigos Científicos" };
export const dynamic = "force-dynamic";

const CATEGORIAS_MOCK = [
  { slug: "fisioterapia", nome: "Fisioterapia", imagemUrl: "https://placehold.co/600x400/e2e8f0/1e3a8a" },
  { slug: "coletes", nome: "Coletes Ortopédicos", imagemUrl: "https://placehold.co/600x400/e2e8f0/1e3a8a" },
  { slug: "psicologia", nome: "Psicologia", imagemUrl: "https://placehold.co/600x400/e2e8f0/1e3a8a" },
  { slug: "cirurgia", nome: "Cirurgia", imagemUrl: "https://placehold.co/600x400/e2e8f0/1e3a8a" },
  { slug: "diagnostico", nome: "Diagnóstico", imagemUrl: "https://placehold.co/600x400/e2e8f0/1e3a8a" },
  { slug: "exercicios", nome: "Exercícios Específicos", imagemUrl: "https://placehold.co/600x400/e2e8f0/1e3a8a" },
];

export default async function PaginaArtigos() {
  const snapshot = await lerArtigos().orderBy("criadoEm", "desc").get();

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
        
        {/* Hero Area */}
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

        {/* Browse by topic */}
        <section className={estilos.bloco}>
          <div className="container">
            <header className={estilos.blocoCabecalho}>
              <span className={estilos.blocoMarcador}>Categorias</span>
              <h2 className={`tipo-h2 ${estilos.blocoTitulo}`}>Navegue por tópicos</h2>
            </header>
            
            <div className={estilos.gradeTres}>
              {CATEGORIAS_MOCK.map((cat) => (
                <CardCategoriaArtigo 
                  key={cat.slug} 
                  nome={cat.nome} 
                  imagemUrl={cat.imagemUrl} 
                  slug={cat.slug} 
                />
              ))}
            </div>
          </div>
        </section>

        {/* Most read this week */}
        <section className={estilos.bloco} style={{ backgroundColor: 'var(--color-bg)' }}>
          <div className="container">
            <header className={estilos.blocoCabecalho}>
              <span className={estilos.blocoMarcador}>Top Artigos</span>
              <h2 className={`tipo-h2 ${estilos.blocoTitulo}`}>Mais lidos da semana</h2>
            </header>

            <div className={estilos.gradeTres}>
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
