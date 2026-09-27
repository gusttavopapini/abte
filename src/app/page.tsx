import { Botao } from "@/components/Botao/Botao";
import { CardPublico } from "@/components/CardPublico/CardPublico";
import { Estatisticas } from "@/components/Estatisticas/Estatisticas";
import { Hero } from "@/components/Hero/Hero";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import estilos from "./page.module.css";

export const metadata = {
  title: "Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose",
  description:
    "No site da Associação Brasileira de Tratamento da Escoliose | Tratando Escoliose você encontra informação confiável, profissionais certificados e apoio para pacientes e famílias. Reunimos conteúdos e profissionais referência nacional no tratamento conservador da escoliose.",
};

export default function PaginaInicial() {
  return (
    <LayoutPublico header="transparente">
      {/* S1. Hero */}
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
        {/* S3. Afirmação + cards de público */}
        <section className={`container ${estilos.secao}`}>
          <div className={`${estilos.margemBaixoLarga} ${estilos.larguraTexto}`}>
            <h2>Juntos transformamos a jornada da escoliose no Brasil</h2>
            <p className="tipo-texto-xl">
              Nossa missão é promover o tratamento conservador da escoliose baseado em evidências, apoiando pacientes e qualificando profissionais.
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

        {/* S4. Números da ABTE */}
        <section className={estilos.secaoAlt}>
          <div className="container">
            <h2 className={estilos.margemBaixoLarga}>A ABTE em números</h2>
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

        {/* S6. Quem somos / Mutirões */}
        <section className={`container ${estilos.secao}`}>
          <div className={estilos.larguraTexto}>
            <h2 className={estilos.margemBaixoMedia}>Conheça nossa história</h2>
            <p className={`tipo-texto-xl ${estilos.margemBaixoMedia}`}>
              Nascemos em 2018 como o projeto Tratando Escoliose e fomos fundados oficialmente como Associação Brasileira em 2021. Desde então, expandimos nossa atuação para toda a América do Sul, sempre focados em disseminar os métodos reconhecidos pela SOSORT (Sociedade Internacional de Reabilitação Ortopédica e Tratamento Conservador da Escoliose).
            </p>
            <div>
              <Botao href="/sobre">Leia a história completa</Botao>
            </div>
          </div>
        </section>

        {/* Placeholders: Conteúdo (Blog/Loja) */}
        <section className={estilos.secaoAlt}>
          <div className={`container ${estilos.blocoCentralizado}`}>
            <h2 className={estilos.margemBaixoMedia}>Conteúdo confiável e Loja</h2>
            <p className={`tipo-texto-xl ${estilos.margemBaixoLarga}`}>
              A cada quinzena, nossos profissionais trazem informações baseadas em evidências, dicas de cuidado e novidades sobre pesquisas. Além disso, cada produto comprado na nossa futura loja será uma ação pela escoliose!
            </p>
            <div className={estilos.botoesCentro}>
              <Botao href="/blog">Acesse o Blog</Botao>
              <Botao href="/loja" variante="secundario">
                Ver produtos (Em breve)
              </Botao>
            </div>
          </div>
        </section>
      </main>
    </LayoutPublico>
  );
}
