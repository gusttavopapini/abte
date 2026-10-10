import { Botao } from "@/components/Botao/Botao";
import { CardPublico } from "@/components/CardPublico/CardPublico";
import { Estatisticas } from "@/components/Estatisticas/Estatisticas";
import { Hero } from "@/components/Hero/Hero";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import { revelar } from "@/components/Revelar/revelar";
import { IconeAlvo, IconeOlho, IconeCoracao } from "@/components/Icones/Icones";
import estilos from "./page.module.css";

export const metadata = {
  title: "Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose",
  description:
    "No site da Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose você encontra informação confiável, profissionais certificados e apoio para pacientes e famílias. Reunimos conteúdos e profissionais referência nacional no tratamento conservador da escoliose.",
};

export default function PaginaInicial() {
  return (
    <LayoutPublico header="transparente">
      {/* 1. Hero */}
      <Hero
        sobHeaderFixo
        imagens={[
          "https://picsum.photos/id/1018/1920/800",
          "https://picsum.photos/id/1015/1920/800",
          "https://picsum.photos/id/1016/1920/800",
        ]}
      />

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
              <PlaceholderImagem style={{ minHeight: "500px", height: "100%" }} />
            </div>
          </div>
        </section>

        {/* 4. Quem somos: vídeo, missão, visão e valores */}
        <section className={`container ${estilos.secao}`}>
          <div className={estilos.blocoCentralizado}>
            <div {...revelar()}>
              <h2 className={`${estilos.tituloSecao} ${estilos.tituloCompacto} ${estilos.centralizado}`}>Quem Somos</h2>
            </div>
          </div>
          
          <div className={estilos.gradeQuatro}>
            {/* O Vídeo atuando como 1º card */}
            <div {...revelar()}>
              <div style={{ aspectRatio: '9/16', background: 'var(--color-surface-soft)', borderRadius: '5px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <PlaceholderImagem style={{ flex: 1, minHeight: '100%' }} />
              </div>
            </div>

            <div {...revelar(undefined, 1)}>
              <div className={estilos.cardValor}>
                <div className={estilos.cabecalhoDoValor}>
                  <IconeAlvo className={estilos.iconeValor} />
                  <h3 className={`tipo-h4 ${estilos.tituloDoValor}`}>Missão</h3>
                </div>
                <p className={estilos.textoDoValor}>
                  Reunir fisioterapeutas, médicos e parceiros engajados no Tratamento Conservador da Escoliose Baseado em Evidências, para trocar informações, criar ações de conscientização e promover tratamentos de qualidade em todo o território nacional.
                </p>
              </div>
            </div>

            <div {...revelar(undefined, 2)}>
              <div className={estilos.cardValor}>
                <div className={estilos.cabecalhoDoValor}>
                  <IconeOlho className={estilos.iconeValor} />
                  <h3 className={`tipo-h4 ${estilos.tituloDoValor}`}>Visão</h3>
                </div>
                <p className={estilos.textoDoValor}>
                  Ser referência em Tratamento Conservador da Escoliose na América Latina.
                </p>
              </div>
            </div>

            <div {...revelar(undefined, 3)}>
              <div className={estilos.cardValor}>
                <div className={estilos.cabecalhoDoValor}>
                  <IconeCoracao className={estilos.iconeValor} />
                  <h3 className={`tipo-h4 ${estilos.tituloDoValor}`}>Valores</h3>
                </div>
                <p className={estilos.textoDoValor}>
                  Ética, Empatia, Comprometimento, Acolhimento, Respeito, Trabalho em equipe, Responsabilidade Social, Educação Continuada e Prática Baseada em Evidências.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Chamada final: caixa flutuante sobre a imagem */}
        <section className={`${estilos.secao} ${estilos.semRespiroInferior}`}>
          <div style={{ position: "relative", width: "100%", height: "600px", overflow: "hidden" }}>
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
