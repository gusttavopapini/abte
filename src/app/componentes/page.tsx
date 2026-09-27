import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BlocoContato } from "@/components/BlocoContato/BlocoContato";
import { Botao, type EstadoDemonstracao, type VarianteBotao } from "@/components/Botao/Botao";
import { CardPublico } from "@/components/CardPublico/CardPublico";
import { Depoimento } from "@/components/Depoimento/Depoimento";
import { Estatisticas } from "@/components/Estatisticas/Estatisticas";
import { Header } from "@/components/Header/Header";
import { Hero } from "@/components/Hero/Hero";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { Rotulo } from "@/components/Rotulo/Rotulo";
import { AmostrasCores } from "./_demonstracao/AmostrasCores/AmostrasCores";
import { EscalaTipografica } from "./_demonstracao/EscalaTipografica/EscalaTipografica";
import estilos from "./componentes.module.css";

// Página de revisão visual. Fora de qualquer menu e fora dos buscadores.
export const metadata: Metadata = {
  title: "Componentes",
  robots: { index: false, follow: false },
};

function Secao({ titulo, children, largura }: { titulo: string; children: ReactNode; largura?: "total" }) {
  return (
    <section className={`${estilos.secao} ${largura === "total" ? "" : "container"}`}>
      <h2 className={largura === "total" ? "container" : undefined}>{titulo}</h2>
      {children}
    </section>
  );
}

const VARIANTES: { variante: VarianteBotao; nome: string }[] = [
  { variante: "primario", nome: "Primário" },
  { variante: "secundario", nome: "Secundário" },
  { variante: "link", nome: "Link" },
  { variante: "envio", nome: "Envio" },
];

const ESTADOS: { estado: EstadoDemonstracao | "padrao" | "desabilitado"; nome: string }[] = [
  { estado: "padrao", nome: "Padrão" },
  { estado: "hover", nome: "Hover" },
  { estado: "foco", nome: "Foco" },
  { estado: "desabilitado", nome: "Desabilitado" },
];

export default function PaginaComponentes() {
  return (
    <LayoutPublico>
      <div className={`container ${estilos.cabecalho}`}>
        <h1>Componentes</h1>
        <p className="tipo-texto-lg">
          Página de revisão visual do design system v3.1. Os textos marcados com [exemplo] não são conteúdo real.
        </p>
      </div>

      <Secao titulo="Cores">
        <AmostrasCores />
      </Secao>

      <Secao titulo="Tipografia">
        <EscalaTipografica />
      </Secao>

      <Secao titulo="Rótulos entre colchetes">
        <div className={`tipo-texto-xl ${estilos.linha}`}>
          <Rotulo texto="A" />
          <Rotulo texto="B" />
          <Rotulo texto="01" />
        </div>
      </Secao>

      <Secao titulo="Botões">
        <div className={estilos.tabelaBotoes}>
          {VARIANTES.map(({ variante, nome }) => (
            <div key={variante} className={estilos.linhaBotoes}>
              <h3 className="tipo-texto">{nome}</h3>
              <ul role="list" className={estilos.estados}>
                {ESTADOS.map(({ estado, nome: nomeEstado }) => (
                  <li key={estado} className={estilos.estado}>
                    <span className="tipo-pequeno">{nomeEstado}</span>
                    <Botao
                      variante={variante}
                      demonstrar={estado === "hover" || estado === "foco" ? estado : undefined}
                      disabled={estado === "desabilitado"}
                    >
                      Doe para a ABTE
                    </Botao>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Cards [A] e [B]">
        <div className={estilos.duasColunas}>
          <CardPublico
            letra="A"
            frase="[exemplo] Quero cuidar da minha coluna."
            titulo="[exemplo] Para pacientes e famílias"
            texto="[exemplo] Texto de apoio do card, com uma ou duas frases curtas."
            botao={{ rotulo: "Encontre um profissional", href: "/profissionais" }}
          />
          <CardPublico
            letra="B"
            frase="[exemplo] Quero fazer parte da rede."
            titulo="[exemplo] Para profissionais de saúde"
            texto="[exemplo] Texto de apoio do card, com uma ou duas frases curtas."
            botao={{ rotulo: "Seja associado", href: "/seja-associado" }}
          />
        </div>
      </Secao>

      <Secao titulo="Estatísticas">
        <Estatisticas
          itens={[
            { numero: "00", legenda: "[exemplo] Legenda da estatística" },
            { numero: "00", legenda: "[exemplo] Legenda da estatística" },
            { numero: "00", legenda: "[exemplo] Legenda da estatística" },
            { numero: "00", legenda: "[exemplo] Legenda da estatística" },
          ]}
        />
      </Secao>

      <Secao titulo="Depoimento">
        <div className={estilos.tresColunas}>
          <Depoimento
            categoria="[exemplo] Voz da família"
            citacao="[exemplo] Texto do depoimento. Não há depoimentos reais ainda."
            nome="[exemplo] Nome"
            funcao="[exemplo] Função"
          />
        </div>
      </Secao>

      <Secao titulo="Hero" largura="total">
        <Hero
          elementoTitulo="p"
          titulo="[exemplo] Título do hero em duas linhas"
          cartao={{
            texto: "[exemplo] Texto do cartão do hero, com uma ou duas frases.",
            botoes: (
              <>
                <Botao href="/profissionais">Encontre um profissional</Botao>
                <Botao href="/seja-associado" variante="secundario">
                  Seja associado
                </Botao>
              </>
            ),
          }}
        />
      </Secao>

      <Secao titulo="Header" largura="total">
        <div className={estilos.exemploHeader}>
          <p className="container tipo-pequeno">Variante transparente (home, sobre o hero)</p>
          <div className={estilos.fundoHero}>
            <Header variante="transparente" demonstracao />
          </div>
        </div>
        <div className={estilos.exemploHeader}>
          <p className="container tipo-pequeno">Variante sólida (páginas internas)</p>
          <Header variante="solida" demonstracao />
        </div>
      </Secao>

      <Secao titulo="Bloco de contato: padrão, erro e sucesso">
        <div className={estilos.tresColunas}>
          <BlocoContato />
          <BlocoContato estadoInicial="erro" />
          <BlocoContato estadoInicial="sucesso" />
        </div>
      </Secao>
    </LayoutPublico>
  );
}
