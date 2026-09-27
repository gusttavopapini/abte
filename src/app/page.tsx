import { Botao } from "@/components/Botao/Botao";
import { CardPublico } from "@/components/CardPublico/CardPublico";
import { Estatisticas } from "@/components/Estatisticas/Estatisticas";
import { Hero } from "@/components/Hero/Hero";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
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
          <div className={`${estilos.margemBaixoLarga} ${estilos.larguraTexto}`}>
            <h2>Juntos transformamos a jornada da escoliose no Brasil</h2>
            <p className="tipo-texto-xl">
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

        {/* 3. By The Numbers / Números da ABTE */}
        <section className={estilos.secaoAlt}>
          <div className="container">
            <h2 className={estilos.margemBaixoLarga}>Mutirões que Transformam Vidas</h2>
            <Estatisticas
              itens={[
                { numero: "+45", legenda: "Pacientes atendidos nos mutirões" },
                { numero: "500", legenda: "Atendimentos realizados" },
                { numero: "69", legenda: "Fisioterapeutas membros" },
                { numero: "23", legenda: "Médicos associados" },
              ]}
            />
          </div>
        </section>

        {/* 4. Stories / Blog & Loja do site antigo */}
        <section className={`container ${estilos.secao}`}>
          <div className={estilos.blocoCentralizado}>
            <h2 className={estilos.margemBaixoMedia}>Conteúdo confiável e Loja</h2>
            <p className={`tipo-texto-xl ${estilos.margemBaixoLarga}`}>
              A cada quinzena, nossos profissionais trazem informações baseadas em evidências. Além disso, cada produto comprado na nossa loja é uma ação pela escoliose!
            </p>
            <div className={estilos.botoesCentro}>
              <Botao href="/blog">Acesse o Blog</Botao>
              <Botao href="/loja" variante="secundario">
                Ver produtos (Em breve)
              </Botao>
            </div>
          </div>
        </section>

        {/* 5. Who We Are / Missão, Visão e Valores (Site Antigo) */}
        <section className={estilos.secaoAlt}>
          <div className={`container ${estilos.gradeCards}`} style={{ alignItems: "center" }}>
            <div>
              <PlaceholderImagem style={{ minHeight: "400px" }} />
            </div>
            <div>
              <h2 className={estilos.margemBaixoLarga}>Quem Somos</h2>
              <div className={estilos.margemBaixoMedia}>
                <h3 className="tipo-h5">Missão</h3>
                <p>
                  Reunir fisioterapeutas, médicos e parceiros engajados no Tratamento Conservador da Escoliose Baseado em Evidências, para trocar informações, criar ações de conscientização e promover tratamentos de qualidade em todo o território nacional.
                </p>
              </div>
              <div className={estilos.margemBaixoMedia}>
                <h3 className="tipo-h5">Visão</h3>
                <p>
                  Ser referência em Tratamento Conservador da Escoliose na América Latina.
                </p>
              </div>
              <div className={estilos.margemBaixoMedia}>
                <h3 className="tipo-h5">Valores</h3>
                <p>
                  Ética, Empatia, Comprometimento, Acolhimento, Respeito, Trabalho em equipe, Responsabilidade Social, Educação Continuada e Prática Baseada em Evidências.
                </p>
              </div>
              <div style={{ marginTop: "var(--space-32)" }}>
                <Botao href="/sobre">Nossa história e diretoria</Botao>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Ready to find your balance? / CTA Final */}
        <section className={`container ${estilos.secao}`}>
          <div className={estilos.blocoCentralizado}>
            <h2 className={estilos.margemBaixoMedia}>Faça parte dessa rede</h2>
            <p className={`tipo-texto-xl ${estilos.margemBaixoLarga}`}>
              Ajude-nos a transformar a vida de milhares de pacientes com escoliose em todo o Brasil. Você pode contribuir se associando ou fazendo uma doação.
            </p>
            <div className={estilos.botoesCentro}>
              <Botao href="/seja-associado">Quero me associar</Botao>
              <Botao href="/doe" variante="secundario">
                Quero fazer uma doação
              </Botao>
            </div>
          </div>
        </section>
      </main>
    </LayoutPublico>
  );
}
