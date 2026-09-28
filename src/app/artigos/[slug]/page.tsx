import { notFound } from "next/navigation";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { Botao } from "@/components/Botao/Botao";
import estilos from "./page.module.css";

const ARTIGOS_MOCK = [
  { slug: "artigo-1", titulo: "Indicações da técnica Vertebral Body Tethering (VBT)", conteudo: "Este é o conteúdo detalhado do artigo científico...", data: "25 Set 2026", autor: "Dr. João Silva" },
  { slug: "artigo-2", titulo: "Reabilitação pós-artrodese na escoliose idiopática do adolescente", conteudo: "Este é o conteúdo detalhado do artigo científico...", data: "20 Set 2026", autor: "Fisio. Maria Costa" },
  { slug: "artigo-3", titulo: "Entendendo a fisiologia do tratamento postural", conteudo: "Este é o conteúdo detalhado do artigo científico...", data: "15 Set 2026", autor: "Dr. Pedro Santos" },
];

export default async function PaginaLeituraArtigo({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const artigo = ARTIGOS_MOCK.find(p => p.slug === resolvedParams.slug);

  if (!artigo) {
    notFound();
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
                <span className={estilos.data}>{artigo.data}</span>
                <span className={estilos.separador}>•</span>
                <span className={estilos.autor}>por {artigo.autor}</span>
              </div>
            </header>

            <div className={`tipo-texto ${estilos.conteudo}`}>
              <p>{artigo.conteudo}</p>
              <p>O painel de controle vai popular esta página em breve com conteúdos reais formatados.</p>
            </div>
          </article>
        </div>
      </main>
    </LayoutPublico>
  );
}
