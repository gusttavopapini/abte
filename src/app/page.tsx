import { Botao } from "@/components/Botao/Botao";
import { CardProduto } from "@/components/CardProduto/CardProduto";
import { CardPublico } from "@/components/CardPublico/CardPublico";
import { Estatisticas } from "@/components/Estatisticas/Estatisticas";
import { Hero } from "@/components/Hero/Hero";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import { revelar } from "@/components/Revelar/revelar";
import { IconeAlvo, IconeOlho, IconeCoracao } from "@/components/Icones/Icones";
import { listarProdutosVisiveis } from "@/lib/dados/colecoes";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import type { ImagemNaTela } from "@/lib/midia/tela";
import { escolherProdutosEmDestaque, imagemPrincipal } from "@/lib/produtos";
import { SLIDES_DO_BANNER } from "@/lib/site/banners";
import { VIDEO_QUEM_SOMOS } from "@/lib/site/video";
import { VideoVertical } from "@/components/VideoVertical/VideoVertical";
import type { ProdutoDoCard } from "@/components/CardProduto/CardProduto";
import estilos from "./page.module.css";

export const metadata = {
  title: "Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose",
  description:
    "No site da Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose você encontra informação confiável, profissionais certificados e apoio para pacientes e famílias. Reunimos conteúdos e profissionais referência nacional no tratamento conservador da escoliose.",
};

// Missão, visão e valores da section "Quem Somos", na ordem da página.
const VALORES = [
  {
    titulo: "Missão",
    Icone: IconeAlvo,
    texto:
      "Reunir fisioterapeutas, médicos e parceiros engajados no Tratamento Conservador da Escoliose Baseado em Evidências, para trocar informações, criar ações de conscientização e promover tratamentos de qualidade em todo o território nacional.",
  },
  { titulo: "Visão", Icone: IconeOlho, texto: "Ser referência em Tratamento Conservador da Escoliose na América Latina." },
  {
    titulo: "Valores",
    Icone: IconeCoracao,
    texto:
      "Ética, Empatia, Comprometimento, Acolhimento, Respeito, Trabalho em equipe, Responsabilidade Social, Educação Continuada e Prática Baseada em Evidências.",
  },
];

// Os produtos em destaque vêm do Firestore a cada visita, como na /loja.
export const dynamic = "force-dynamic";

// Até 4 produtos da loja para a home (regra em escolherProdutosEmDestaque).
// Se a leitura falhar, a home abre sem a section, em vez de dar erro.
async function lerProdutosEmDestaque(): Promise<ProdutoDoCard[]> {
  try {
    const produtos = await listarProdutosVisiveis();
    const imagens = await imagensAtivasPorId(produtos.flatMap((produto) => produto.imagens.map((imagem) => imagem.midiaId)));
    const principal = (galeria: (typeof produtos)[number]["imagens"]): ImagemNaTela | null => imagemPrincipal(galeria, imagens);
    return escolherProdutosEmDestaque(produtos, (galeria) => principal(galeria) !== null).map((produto) => ({
      nome: produto.nome,
      slug: produto.slug,
      preco: produto.preco,
      precoPromocional: produto.precoPromocional,
      selo: produto.selo,
      esgotado: false,
      imagem: principal(produto.imagens),
    }));
  } catch (erro) {
    console.error("Home: falha ao ler os produtos em destaque.", erro);
    return [];
  }
}

export default async function PaginaInicial() {
  const produtosEmDestaque = await lerProdutosEmDestaque();
  return (
    <LayoutPublico header="transparente">
      {/* Único H1 da página, só para leitores de tela, enquanto o banner não
          tiver título visível (pendência de design no CLAUDE.md). */}
      <h1 className="somente-leitor">ABTE, Associação Brasileira de Tratamento da Escoliose</h1>

      {/* 1. Hero */}
      <Hero sobHeaderFixo slides={SLIDES_DO_BANNER} />

      <div>
        {/* 2. Afirmação + cards de público */}
        <section className={`container ${estilos.secao}`}>
          <div {...revelar(estilos.gradeLadoALado)}>
            <h2 className={estilos.tituloSecao}>Juntos transformamos a jornada da escoliose no Brasil</h2>
            <p className={`tipo-texto-xl ${estilos.textoLeve}`}>
              Promovemos o tratamento conservador da escoliose baseado em evidências, apoiando pacientes e qualificando profissionais.
            </p>
          </div>
          <div className={estilos.gradeCards}>
            <div {...revelar(undefined, 1)}>
              <CardPublico
                letra="A"
                titulo="Para pacientes e famílias"
                texto="Encontre profissionais capacitados para o tratamento da escoliose perto de você e tenha acesso a materiais informativos de alta qualidade."
                botao={{ rotulo: "Encontre um profissional", href: "/profissionais" }}
              />
            </div>
            <div {...revelar(undefined, 2)}>
              <CardPublico
                letra="B"
                titulo="Para profissionais de saúde"
                texto="Junte-se à Associação. Faça parte de uma rede de especialistas qualificados e ajude a transformar a vida de pessoas com escoliose."
                botao={{ rotulo: "Seja associado", href: "/seja-associado" }}
              />
            </div>
          </div>
        </section>

        {/* 3. Estatísticas: números à esquerda e imagem à direita */}
        <section className={estilos.secaoAlt}>
          <div className={`container ${estilos.gradeMeioAMeio}`}>
            <div {...revelar(estilos.colunaCentralizada)}>
              <h2 className={estilos.tituloSecao}>Mutirões que Transformam Vidas</h2>
              <Estatisticas
                itens={[
                  { numero: "+45", legenda: "Pacientes atendidos nos mutirões" },
                  { numero: "500", legenda: "Atendimentos realizados" },
                  { numero: "69", legenda: "Fisioterapeutas membros" },
                  { numero: "23", legenda: "Médicos associados" },
                ]}
              />
            </div>
            <div {...revelar()}>
              <PlaceholderImagem style={{ minHeight: "500px", height: "100%", borderRadius: "var(--radius)" }} />
            </div>
          </div>
        </section>

        {/* 3b. Produtos em destaque (28/10/2026): só com produto escolhido;
            sem nenhum, a section não aparece. Sem compra nem carrinho aqui. */}
        {produtosEmDestaque.length > 0 && (
          <section className={`container ${estilos.secao}`} aria-labelledby="titulo-produtos-em-destaque">
            <div {...revelar(estilos.cabecalhoDosDestaques)}>
              <h2 id="titulo-produtos-em-destaque" className={`${estilos.tituloSecao} ${estilos.tituloCompacto}`}>Produtos em destaque</h2>
              <p className={`tipo-texto-lg ${estilos.textoLeve}`}>Cartilhas e materiais educativos da ABTE sobre escoliose.</p>
            </div>
            <ul role="list" {...revelar("grade-de-cards")}>
              {produtosEmDestaque.map((produto) => (
                <li key={produto.slug}>
                  <CardProduto produto={produto} nivelDoTitulo={3} />
                </li>
              ))}
            </ul>
            <div className={estilos.acaoDosDestaques}>
              <Botao href="/loja">Ver todos os produtos</Botao>
            </div>
          </section>
        )}

        {/* 4. Quem somos (29/10/2026): missão, visão e valores empilhados numa
            coluna e, ao lado, o vídeo vertical, na mesma altura dos blocos.
            Até 1023px, os blocos primeiro e o vídeo abaixo, centralizado. */}
        <section className={`container ${estilos.secao}`} aria-labelledby="titulo-quem-somos">
          <div className={estilos.blocoCentralizado}>
            <div {...revelar()}>
              <h2 id="titulo-quem-somos" className={`${estilos.tituloSecao} ${estilos.tituloCompacto} ${estilos.centralizado}`}>Quem Somos</h2>
            </div>
          </div>

          <div className={estilos.quemSomos}>
            <div className={estilos.valores}>
              {VALORES.map((valor, indice) => (
                <div key={valor.titulo} {...revelar(estilos.itemDoValor, (indice + 1) as 1 | 2 | 3)}>
                  <div className={estilos.cardValor}>
                    <div className={estilos.cabecalhoDoValor}>
                      <valor.Icone className={estilos.iconeValor} />
                      <h3 className={`tipo-h4 ${estilos.tituloDoValor}`}>{valor.titulo}</h3>
                    </div>
                    <p className={estilos.textoDoValor}>{valor.texto}</p>
                  </div>
                </div>
              ))}
            </div>
            <div {...revelar(estilos.colunaDoVideo)}>
              <VideoVertical endereco={VIDEO_QUEM_SOMOS} titulo="Vídeo da ABTE" />
            </div>
          </div>
        </section>

        {/* 5. Chamada final: caixa flutuante sobre a imagem. Desde 29/10/2026 a
            imagem fica no container, com as bordas alinhadas às do logo e do
            rodapé (antes ia de uma borda à outra da tela). */}
        <section className={`container ${estilos.secao} ${estilos.semRespiroInferior}`}>
          <div className={estilos.imagemDaChamada}>
            <PlaceholderImagem />
            <div className={estilos.caixaFlutuante}>
              <div {...revelar(estilos.caixaFlutuanteConteudo, 2)}>
                <h2 className={`${estilos.tituloSecao} ${estilos.tituloCompacto}`}>Faça parte dessa rede</h2>
                <p className={`tipo-texto-lg ${estilos.textoLeve} ${estilos.textoDaChamada}`}>
                  Ajude-nos a transformar a vida de milhares de pacientes com escoliose em todo o Brasil. Você pode contribuir se associando ou fazendo uma doação.
                </p>
                <div className={estilos.botoesDaChamada}>
                  <Botao href="/seja-associado">Quero me associar</Botao>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </LayoutPublico>
  );
}
