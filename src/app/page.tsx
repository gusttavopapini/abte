import { Botao } from "@/components/Botao/Botao";
import { CardPublico } from "@/components/CardPublico/CardPublico";
import { Estatisticas } from "@/components/Estatisticas/Estatisticas";
import { Hero } from "@/components/Hero/Hero";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { Logo } from "@/components/Logo/Logo";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
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
          <div className={estilos.gradeLadoALado}>
            <h2 className={estilos.tituloSecao}>Juntos transformamos a jornada da escoliose no Brasil</h2>
            <p className="tipo-texto-xl" style={{ fontWeight: 300 }}>
              Promovemos o tratamento conservador da escoliose baseado em evidências, apoiando pacientes e qualificando profissionais.
            </p>
          </div>
          <div className={estilos.gradeCards}>
            <CardPublico
              letra="A"
              frase="Quero cuidar da minha coluna ou da do meu filho."
              titulo="Para pacientes e famílias"
              texto="Encontre profissionais capacitados para o tratamento da escoliose perto de você e tenha acesso a materiais informativos de alta qualidade."
              botao={{ rotulo: "Encontre um profissional", href: "/profissionais" }}
            />
            <CardPublico
              letra="B"
              frase="Quero me especializar e fazer parte da rede."
              titulo="Para profissionais de saúde"
              texto="Junte-se à Associação. Faça parte de uma rede de especialistas qualificados e ajude a transformar a vida de pessoas com escoliose."
              botao={{ rotulo: "Seja associado", href: "/seja-associado" }}
            />
          </div>
        </section>

        {/* 3. By The Numbers / Estatísticas (Imagem na esquerda, números na direita) */}
        <section className={estilos.secaoAlt}>
          <div className={`container ${estilos.gradeMeioAMeio}`}>
            <PlaceholderImagem style={{ minHeight: "500px" }} />
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
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
          </div>
        </section>

        {/* 4. Who We Are / Missão, Visão e Valores (Side-by-side) */}
        <section className={`container ${estilos.secao}`}>
          <div className={estilos.gradeLadoALado}>
            <h2 className={estilos.tituloSecao}>Quem Somos</h2>
            <div>
              <div style={{ marginBottom: "var(--space-32)" }}>
                <h3 className="tipo-h4" style={{ color: "var(--color-primary)", fontWeight: 400, marginBottom: "var(--space-8)" }}>Missão</h3>
                <p style={{ fontWeight: 300 }}>
                  Reunir fisioterapeutas, médicos e parceiros engajados no Tratamento Conservador da Escoliose Baseado em Evidências, para trocar informações, criar ações de conscientização e promover tratamentos de qualidade em todo o território nacional.
                </p>
              </div>
              <div style={{ marginBottom: "var(--space-32)" }}>
                <h3 className="tipo-h4" style={{ color: "var(--color-primary)", fontWeight: 400, marginBottom: "var(--space-8)" }}>Visão</h3>
                <p style={{ fontWeight: 300 }}>
                  Ser referência em Tratamento Conservador da Escoliose na América Latina.
                </p>
              </div>
              <div style={{ marginBottom: "var(--space-32)" }}>
                <h3 className="tipo-h4" style={{ color: "var(--color-primary)", fontWeight: 400, marginBottom: "var(--space-8)" }}>Valores</h3>
                <p style={{ fontWeight: 300 }}>
                  Ética, Empatia, Comprometimento, Acolhimento, Respeito, Trabalho em equipe, Responsabilidade Social, Educação Continuada e Prática Baseada em Evidências.
                </p>
              </div>
              <div>
                <Botao href="/sobre">Nossa história e diretoria</Botao>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Ready to find your balance? / CTA Final flutuante na imagem */}
        <section className={estilos.secao} style={{ paddingBottom: 0 }}>
          <div style={{ position: "relative", width: "100%", height: "600px" }}>
            <PlaceholderImagem />
            <div className={estilos.caixaFlutuante}>
              <h2 className={estilos.tituloSecao} style={{ marginBottom: "var(--space-16)" }}>Faça parte dessa rede</h2>
              <p className="tipo-texto-lg" style={{ fontWeight: 300, marginBottom: "var(--space-32)" }}>
                Ajude-nos a transformar a vida de milhares de pacientes com escoliose em todo o Brasil. Você pode contribuir se associando ou fazendo uma doação.
              </p>
              <div style={{ display: "flex", gap: "var(--space-16)", flexWrap: "wrap" }}>
                <Botao href="/seja-associado">Quero me associar</Botao>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Contact Us / Form e Info (Side-by-side box) */}
        <section className={estilos.contatoGrid}>
          <div className={estilos.contatoBox}>
            <h2 className="tipo-h2" style={{ fontWeight: 300 }}>Contato</h2>
            <form style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
              <div style={{ display: "flex", gap: "var(--space-16)" }}>
                <input type="text" placeholder="Nome" style={{ flex: 1, padding: "var(--space-8)", border: "none", borderBottom: "1px solid white", background: "transparent", color: "white" }} />
                <input type="text" placeholder="Sobrenome" style={{ flex: 1, padding: "var(--space-8)", border: "none", borderBottom: "1px solid white", background: "transparent", color: "white" }} />
              </div>
              <input type="email" placeholder="E-mail" style={{ padding: "var(--space-8)", border: "none", borderBottom: "1px solid white", background: "transparent", color: "white" }} />
              <textarea placeholder="Mensagem" rows={4} style={{ padding: "var(--space-8)", border: "none", borderBottom: "1px solid white", background: "transparent", color: "white" }}></textarea>
              <button type="button" style={{ alignSelf: "flex-start", marginTop: "var(--space-16)", padding: "10px 32px", background: "white", color: "var(--color-primary)", fontWeight: "bold" }}>Enviar</button>
            </form>
          </div>
          <div className={estilos.contatoInfo}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-32)" }}>
              <div>
                <p style={{ fontWeight: "bold", marginBottom: "var(--space-8)" }}>Endereço</p>
                <p style={{ fontWeight: 300 }}>Sede da ABTE<br />Brasil</p>
              </div>
              <div>
                <p style={{ fontWeight: "bold", marginBottom: "var(--space-8)" }}>Legal</p>
                <p style={{ fontWeight: 300, cursor: "pointer" }}>Termos de Uso<br />Política de Privacidade<br />Acessibilidade</p>
              </div>
              <div>
                <p style={{ fontWeight: "bold", marginBottom: "var(--space-8)" }}>Contato</p>
                <p style={{ fontWeight: 300 }}>contato@abteescoliose.com.br</p>
              </div>
            </div>
            <div style={{ marginTop: "auto" }}>
              <Logo />
            </div>
          </div>
        </section>

      </main>
    </LayoutPublico>
  );
}
