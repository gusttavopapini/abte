import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { CardCategoriaArtigo } from "@/components/CardCategoriaArtigo/CardCategoriaArtigo";
import { CardArtigo } from "@/components/CardArtigo/CardArtigo";
import estilos from "./page.module.css";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";

export const metadata = { title: "Artigos Científicos | ABTE" };

const CATEGORIAS_MOCK = [
  { slug: "fisioterapia", nome: "Fisioterapia", imagemUrl: "https://placehold.co/600x400/e2e8f0/1e3a8a" },
  { slug: "coletes", nome: "Coletes Ortopédicos", imagemUrl: "https://placehold.co/600x400/e2e8f0/1e3a8a" },
  { slug: "psicologia", nome: "Psicologia", imagemUrl: "https://placehold.co/600x400/e2e8f0/1e3a8a" },
  { slug: "cirurgia", nome: "Cirurgia", imagemUrl: "https://placehold.co/600x400/e2e8f0/1e3a8a" },
  { slug: "diagnostico", nome: "Diagnóstico", imagemUrl: "https://placehold.co/600x400/e2e8f0/1e3a8a" },
  { slug: "exercicios", nome: "Exercícios Específicos", imagemUrl: "https://placehold.co/600x400/e2e8f0/1e3a8a" },
];

const ARTIGOS_MOCK = [
  { slug: "artigo-1", titulo: "Indicações da técnica Vertebral Body Tethering (VBT)", resumo: "O Vertebral Body Tethering ou VBT é uma técnica cirúrgica para o tratamento das escolioses idiopáticas que preserva a mobilidade da coluna. A técnica tem como princípio...", autor: "Dr. João Silva", data: "25 Set 2026" },
  { slug: "artigo-2", titulo: "Reabilitação pós-artrodese na escoliose idiopática do adolescente", resumo: "O cenário clínico: A Escoliose Idiopática do Adolescente (EIA) é uma alteração estrutural tridimensional da coluna vertebral, de origem multifatorial, diagnosticada quando a...", autor: "Fisio. Maria Costa", data: "20 Set 2026" },
  { slug: "artigo-3", titulo: "Entendendo a fisiologia do tratamento postural", resumo: "As fibras musculares podem mudar? O que a ciência realmente diz sobre adaptação muscular e reeducação postural: uma revisão da literatura. Resumo: Durante mui...", autor: "Dr. Pedro Santos", data: "15 Set 2026" },
];

export default function PaginaArtigos() {
  return (
    <LayoutPublico header="solida">
      <main className={estilos.secao}>
        
        {/* Hero Area */}
        <section className={estilos.hero}>
          <div className={`container ${estilos.heroGrid}`}>
            <div>
               <h1 className={`tipo-display ${estilos.heroTitulo}`}>Artigos Científicos</h1>
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
              {ARTIGOS_MOCK.map((artigo) => (
                <CardArtigo 
                  key={artigo.slug}
                  titulo={artigo.titulo}
                  resumo={artigo.resumo}
                  autor={artigo.autor}
                  data={artigo.data}
                  slug={artigo.slug}
                />
              ))}
            </div>
          </div>
        </section>

      </main>
    </LayoutPublico>
  );
}
