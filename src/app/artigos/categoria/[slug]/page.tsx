import { notFound } from "next/navigation";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { CardArtigo } from "@/components/CardArtigo/CardArtigo";
import { Botao } from "@/components/Botao/Botao";
import estilos from "./page.module.css";

const CATEGORIAS_MOCK = [
  { slug: "fisioterapia", nome: "Fisioterapia" },
  { slug: "coletes", nome: "Coletes Ortopédicos" },
  { slug: "psicologia", nome: "Psicologia" },
  { slug: "cirurgia", nome: "Cirurgia" },
  { slug: "diagnostico", nome: "Diagnóstico" },
  { slug: "exercicios", nome: "Exercícios Específicos" },
];

const ARTIGOS_MOCK = [
  { slug: "artigo-1", titulo: "Indicações da técnica Vertebral Body Tethering (VBT)", resumo: "O Vertebral Body Tethering ou VBT é uma técnica cirúrgica para o tratamento das escolioses idiopáticas que preserva a mobilidade da coluna...", autor: "Dr. João Silva", data: "25 Set 2026" },
  { slug: "artigo-2", titulo: "Reabilitação pós-artrodese na escoliose idiopática", resumo: "O cenário clínico: A Escoliose Idiopática do Adolescente (EIA) é uma alteração estrutural tridimensional da coluna vertebral...", autor: "Fisio. Maria Costa", data: "20 Set 2026" },
  { slug: "artigo-3", titulo: "Entendendo a fisiologia do tratamento postural", resumo: "As fibras musculares podem mudar? O que a ciência realmente diz sobre adaptação muscular e reeducação postural...", autor: "Dr. Pedro Santos", data: "15 Set 2026" },
  { slug: "artigo-4", titulo: "Abordagem precoce na escoliose infantil", resumo: "A importância do diagnóstico precoce nos primeiros anos de vida da criança e como isso altera positivamente o prognóstico...", autor: "Dra. Ana Costa", data: "05 Set 2026" },
];

export default async function PaginaCategoriaArtigos({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const categoria = CATEGORIAS_MOCK.find(c => c.slug === resolvedParams.slug);

  if (!categoria) {
    notFound();
  }

  return (
    <LayoutPublico header="solida">
      <main className={estilos.secao}>
        <div className={`container ${estilos.container}`}>
          <div className={estilos.cabecalho}>
             <Botao href="/artigos" variante="link" className={estilos.voltar}>
               &larr; Voltar para Artigos
             </Botao>
             <h1 className={`tipo-h1 ${estilos.titulo}`}>Artigos sobre {categoria.nome}</h1>
             <p className={`tipo-texto-lg ${estilos.descricao}`}>
               Explorando os artigos e publicações classificados nesta categoria.
             </p>
          </div>

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
      </main>
    </LayoutPublico>
  );
}
