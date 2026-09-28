import { Botao } from "@/components/Botao/Botao";
import { CardPublico } from "@/components/CardPublico/CardPublico";
import { Estatisticas } from "@/components/Estatisticas/Estatisticas";
import { Hero } from "@/components/Hero/Hero";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import { AnimacaoEntrada } from "@/components/AnimacaoEntrada/AnimacaoEntrada";
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
        titulo="ABTE. Informação confiável, profissionais certificados e apoio para pacientes e famílias."
        sobHeaderFixo
        cartao={{
          texto:
            "Aqui você encontra conteúdos e profissionais referência nacional no tratamento conservador da escoliose. Base científica, excelência em atendimento e um olhar atento para quem vive essa jornada.",
          botoes: (
            <>
              <Botao href="/profissionais">Conheça nossos membros</Botao>
              <Botao href="/seja-associado" variante="secundario">
                Seja associado
              </Botao>
            </>
          ),
        }}
      />

      <main>
        {/* 2. Afirmação + cards de público */}
        <section className={`container ${estilos.secao}`}>
          <AnimacaoEntrada direcao="cima" className={estilos.gradeLadoALado}>
            <h2 className={estilos.tituloSecao}>Juntos transformamos a jornada da escoliose no Brasil</h2>
            <p className="tipo-texto-xl" style={{ fontWeight: 300 }}>
              Promovemos o tratamento conservador da escoliose baseado em evidências, apoiando pacientes e qualificando profissionais.
            </p>
          </AnimacaoEntrada>
          <div className={estilos.gradeCards}>
            <AnimacaoEntrada atraso={0.2}>
              <CardPublico
                letra="A"
                titulo="Para pacientes e famílias"
                texto="Encontre profissionais capacitados para o tratamento da escoliose perto de você e tenha acesso a materiais informativos de alta qualidade."
                botao={{ rotulo: "Encontre um profissional", href: "/profissionais" }}
              />
            </AnimacaoEntrada>
            <AnimacaoEntrada atraso={0.4}>
              <CardPublico
                letra="B"
                titulo="Para profissionais de saúde"
                texto="Junte-se à Associação. Faça parte de uma rede de especialistas qualificados e ajude a transformar a vida de pessoas com escoliose."
                botao={{ rotulo: "Seja associado", href: "/seja-associado" }}
              />
            </AnimacaoEntrada>
          </div>
        </section>

        {/* 3. By The Numbers / Estatísticas (Imagem na direita, números na esquerda) */}
        <section className={estilos.secaoAlt}>
          <div className={`container ${estilos.gradeMeioAMeio}`}>
            <AnimacaoEntrada direcao="esquerda" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h2 className={estilos.tituloSecao}>Mutirões que Transformam Vidas</h2>
              <Estatisticas
                itens={[
                  { numero: "+45", legenda: "Pacientes atendidos nos mutirões" },
                  { numero: "500", legenda: "Atendimentos realizados" },
                  { numero: "69", legenda: "Fisioterapeutas membros" },
                  { numero: "23", legenda: "Médicos associados" },
                ]}
              />
            </AnimacaoEntrada>
            <AnimacaoEntrada direcao="direita">
              <PlaceholderImagem style={{ minHeight: "500px", height: "100%" }} />
            </AnimacaoEntrada>
          </div>
        </section>

        {/* 4. Who We Are / Missão, Visão e Valores (3 cards) */}
        <section className={`container ${estilos.secao}`}>
          <div className={estilos.blocoCentralizado}>
            <AnimacaoEntrada direcao="baixo">
              <h2 className={estilos.tituloSecao} style={{ textAlign: "center", marginBottom: "var(--space-16)" }}>Quem Somos</h2>
            </AnimacaoEntrada>
          </div>
          
          <div className={estilos.gradeQuatro}>
            {/* O Vídeo atuando como 1º card */}
            <AnimacaoEntrada direcao="esquerda">
              <div style={{ aspectRatio: '9/16', background: 'var(--color-surface-soft)', borderRadius: '5px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <PlaceholderImagem style={{ flex: 1, minHeight: '100%' }} />
              </div>
            </AnimacaoEntrada>

            <AnimacaoEntrada direcao="cima" atraso={0.1}>
              <div className={estilos.cardValor}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-16)", marginBottom: "var(--space-16)" }}>
                  <IconeAlvo className={estilos.iconeValor} />
                  <h3 className="tipo-h4" style={{ color: "var(--color-primary)", fontWeight: 400, margin: 0 }}>Missão</h3>
                </div>
                <p style={{ fontWeight: 300, color: "var(--color-text)" }}>
                  Reunir fisioterapeutas, médicos e parceiros engajados no Tratamento Conservador da Escoliose Baseado em Evidências, para trocar informações, criar ações de conscientização e promover tratamentos de qualidade em todo o território nacional.
                </p>
              </div>
            </AnimacaoEntrada>

            <AnimacaoEntrada direcao="cima" atraso={0.3}>
              <div className={estilos.cardValor}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-16)", marginBottom: "var(--space-16)" }}>
                  <IconeOlho className={estilos.iconeValor} />
                  <h3 className="tipo-h4" style={{ color: "var(--color-primary)", fontWeight: 400, margin: 0 }}>Visão</h3>
                </div>
                <p style={{ fontWeight: 300, color: "var(--color-text)" }}>
                  Ser referência em Tratamento Conservador da Escoliose na América Latina.
                </p>
              </div>
            </AnimacaoEntrada>

            <AnimacaoEntrada direcao="cima" atraso={0.5}>
              <div className={estilos.cardValor}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-16)", marginBottom: "var(--space-16)" }}>
                  <IconeCoracao className={estilos.iconeValor} />
                  <h3 className="tipo-h4" style={{ color: "var(--color-primary)", fontWeight: 400, margin: 0 }}>Valores</h3>
                </div>
                <p style={{ fontWeight: 300, color: "var(--color-text)" }}>
                  Ética, Empatia, Comprometimento, Acolhimento, Respeito, Trabalho em equipe, Responsabilidade Social, Educação Continuada e Prática Baseada em Evidências.
                </p>
              </div>
            </AnimacaoEntrada>
          </div>
        </section>

        {/* 5. Ready to find your balance? / CTA Final flutuante na imagem */}
        <section className={estilos.secao} style={{ paddingBottom: 0 }}>
          <div style={{ position: "relative", width: "100%", height: "600px", overflow: "hidden" }}>
            <PlaceholderImagem />
            <div className={estilos.caixaFlutuante}>
              <AnimacaoEntrada className={estilos.caixaFlutuanteConteudo} direcao="cima" atraso={0.3}>
                <h2 className={estilos.tituloSecao} style={{ marginBottom: "var(--space-16)" }}>Faça parte dessa rede</h2>
                <p className="tipo-texto-lg" style={{ fontWeight: 300, marginBottom: "var(--space-32)" }}>
                  Ajude-nos a transformar a vida de milhares de pacientes com escoliose em todo o Brasil. Você pode contribuir se associando ou fazendo uma doação.
                </p>
                <div style={{ display: "flex", gap: "var(--space-16)", flexWrap: "wrap" }}>
                  <Botao href="/seja-associado">Quero me associar</Botao>
                </div>
              </AnimacaoEntrada>
            </div>
          </div>
        </section>

      </main>
    </LayoutPublico>
  );
}
