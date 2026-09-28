import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { CardPost } from "@/components/CardPost/CardPost";
import estilos from "./page.module.css";

export const metadata = { title: "Blog | ABTE" };

// Mock temporário enquanto não há banco de dados
const POSTS_MOCK = [
  { slug: "post-1", titulo: "O que é Escoliose Idiopática?", resumo: "Entenda as causas, sintomas e os principais sinais de alerta para o diagnóstico precoce da escoliose na adolescência.", imagemUrl: "https://placehold.co/600x400/e2e8f0/1e3a8a" },
  { slug: "post-2", titulo: "Coletes Ortopédicos: Mitos e Verdades", resumo: "Muitas dúvidas surgem quando o uso do colete é indicado. Esclarecemos os pontos mais comuns sobre a adaptação e resultados.", imagemUrl: "https://placehold.co/600x400/e2e8f0/1e3a8a" },
  { slug: "post-3", titulo: "Exercícios Fisioterapêuticos", resumo: "A importância dos exercícios específicos no tratamento conservador da escoliose e como eles atuam na estabilização." },
  { slug: "post-4", titulo: "Apoio Psicológico durante o Tratamento", resumo: "O impacto emocional do diagnóstico e a importância do acompanhamento profissional para jovens e familiares.", imagemUrl: "https://placehold.co/600x400/e2e8f0/1e3a8a" },
];

export default function PaginaBlog() {
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
            {POSTS_MOCK.map((post) => (
              <CardPost 
                key={post.slug}
                titulo={post.titulo}
                resumo={post.resumo}
                imagemUrl={post.imagemUrl}
                slug={post.slug}
              />
            ))}
          </div>
        </div>
      </main>
    </LayoutPublico>
  );
}
