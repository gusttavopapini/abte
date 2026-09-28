import { notFound } from "next/navigation";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { Botao } from "@/components/Botao/Botao";
import estilos from "./page.module.css";

const POSTS_MOCK = [
  { slug: "post-1", titulo: "O que é Escoliose Idiopática?", conteudo: "Aqui entrará o texto completo da postagem...", data: "25 Set 2026", autor: "Dr. João Silva" },
  { slug: "post-2", titulo: "Coletes Ortopédicos: Mitos e Verdades", conteudo: "Aqui entrará o texto completo da postagem...", data: "22 Set 2026", autor: "Dra. Maria Santos" },
  { slug: "post-3", titulo: "Exercícios Fisioterapêuticos", conteudo: "Aqui entrará o texto completo da postagem...", data: "15 Set 2026", autor: "Fisioterapeuta Carlos" },
  { slug: "post-4", titulo: "Apoio Psicológico durante o Tratamento", conteudo: "Aqui entrará o texto completo da postagem...", data: "10 Set 2026", autor: "Psicóloga Ana" },
];

export default async function PaginaPost({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const post = POSTS_MOCK.find(p => p.slug === resolvedParams.slug);

  if (!post) {
    notFound();
  }

  return (
    <LayoutPublico header="solida">
      <main className={estilos.secao}>
        <div className={`container ${estilos.container}`}>
          <div className={estilos.voltar}>
             <Botao href="/blog" variante="link">
               &larr; Voltar para o Blog
             </Botao>
          </div>

          <article className={estilos.post}>
            <header className={estilos.cabecalho}>
              <h1 className={`tipo-h1 ${estilos.titulo}`}>{post.titulo}</h1>
              <div className={estilos.meta}>
                <span className={estilos.data}>{post.data}</span>
                <span className={estilos.autor}>por {post.autor}</span>
              </div>
            </header>

            <div className={`tipo-texto ${estilos.conteudo}`}>
              <p>{post.conteudo}</p>
              <p>Este é um post de exemplo. O conteúdo real será gerado pelo painel administrativo quando o banco de dados for conectado.</p>
            </div>
          </article>
        </div>
      </main>
    </LayoutPublico>
  );
}
