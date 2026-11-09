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
import { ResumoDaCompra } from "@/app/loja/_componentes/ResumoDaCompra/ResumoDaCompra";
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
            titulo="[exemplo] Para pacientes e famílias"
            texto="[exemplo] Texto de apoio do card, com uma ou duas frases curtas."
            botao={{ rotulo: "Encontre um profissional", href: "/profissionais" }}
          />
          <CardPublico
            letra="B"
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
          slides={[
            { imagem: "https://picsum.photos/id/1018/1920/800", alt: "[exemplo] Slide sem link", href: "", rotulo: "" },
            { imagem: "https://picsum.photos/id/1015/1920/800", alt: "[exemplo] Slide com link", href: "/componentes", rotulo: "[exemplo] Slide com link para esta página" },
          ]}
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

      {/* Resumo da caixa de compra (08/11/2026) com valores de exemplo, para
          conferir o caso com frete sem gravar frete nos dados. */}
      <Secao titulo="Resumo da caixa de compra: exemplos">
        <div className={estilos.tresColunas}>
          <div data-exemplo="frete-1">
            <p className="tipo-pequeno">[exemplo] R$ 35,00, 1 item, frete R$ 25,00</p>
            <ResumoDaCompra precoUnitario={3500} quantidade={1} tipo="fisico" freteFixo={2500} />
          </div>
          <div data-exemplo="frete-4">
            <p className="tipo-pequeno">[exemplo] R$ 39,99 em promoção, 4 itens, frete R$ 25,00</p>
            <ResumoDaCompra precoUnitario={3999} quantidade={4} tipo="fisico" freteFixo={2500} />
          </div>
          <div data-exemplo="digital">
            <p className="tipo-pequeno">[exemplo] produto digital de R$ 9,90</p>
            <ResumoDaCompra precoUnitario={990} quantidade={1} tipo="digital" freteFixo={2500} />
          </div>
        </div>
      </Secao>
    </LayoutPublico>
  );
}
