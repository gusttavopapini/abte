"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { Botao } from "@/components/Botao/Botao";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { linkDoSlide, type SlideDoBanner } from "@/lib/site/banners";
import { ancoraDoLink } from "@/lib/site/ancoras";
import { partesDoTitulo } from "@/lib/site/home";
import estilos from "./Hero.module.css";
import { TituloAjustavel } from "./TituloAjustavel";

export type FormatoDaPrevia = "computador" | "tablet" | "celular";

// Link para uma seção da home (30/10/2026): na própria home, rola até a
// seção (suave, ou direto com movimento reduzido), põe o foco no título e
// atualiza o endereço; em outra página, o "/#âncora" segue normalmente.
function irParaAncora(evento: MouseEvent<HTMLAnchorElement>, href: string) {
  const id = ancoraDoLink(href);
  if (!id || window.location.pathname !== "/") return;
  const secao = document.getElementById(id);
  if (!secao) return;
  evento.preventDefault();
  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  secao.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
  secao.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  window.history.pushState(null, "", `#${id}`);
}

// Ponto de foco do banner: a classe com o object-position.
const CLASSE_DO_FOCO = { esquerda: estilos.focoEsquerda, centro: estilos.focoCentro, direita: estilos.focoDireita };
const CLASSE_DA_POSICAO = { esquerda: estilos.textoEsquerda, centro: estilos.textoCentro, direita: estilos.textoDireita };
const CLASSE_DO_FORMATO = { computador: estilos.formatoComputador, tablet: estilos.formatoTablet, celular: estilos.formatoCelular };

// Imagem da versão pedida na prévia, com a cadeia de substituição do site.
function imagemDoFormato(slide: SlideDoBanner, formato: FormatoDaPrevia) {
  const midia = slide.midia;
  if (!midia) return null;
  if (formato === "celular") return midia.celular ?? midia.tablet ?? midia;
  if (formato === "tablet") return midia.tablet ?? midia;
  return midia;
}

// Conteúdo de um slide do banner da home (30/10/2026): a imagem (com as
// versões computador, tablet e celular), o véu e, quando o painel tem texto,
// o título (h2, com o trecho em destaque), o subtítulo e o botão. Um só
// destino por banner: com texto do botão, o botão é o link real e cobre o
// banner inteiro pelo ::after (link esticado, sem links aninhados); sem
// botão, o banner inteiro é o link, como antes. Usado pelo Hero e pela
// prévia do painel (formato fixo, sem link).
export function ConteudoDoSlide({ slide, prioridade, formato }: { slide: SlideDoBanner; prioridade?: boolean; formato?: FormatoDaPrevia }) {
  const previa = Boolean(formato);
  const link = previa ? null : linkDoSlide(slide);
  const externo = link?.href.startsWith("https://") ?? false;
  const texto = slide.texto ?? null;
  const comBotao = Boolean(texto?.textoDoBotao && (link || previa));
  // Com link no banner inteiro, o nome vem do link e a imagem fica
  // decorativa; com botão, o nome vem do botão e a imagem mantém o alt.
  const alt = link && !comBotao ? "" : slide.alt;
  const foco = CLASSE_DO_FOCO[slide.pontoDeFoco ?? "centro"];
  const imagemDaPrevia = formato ? imagemDoFormato(slide, formato) : null;
  const imagem = imagemDaPrevia ? (
    <ImagemDaMidia variantes={imagemDaPrevia.variantes} alt="" largura={imagemDaPrevia.largura} altura={imagemDaPrevia.altura} sizes="400px" className={`${estilos.imagem} ${foco}`} />
  ) : slide.midia ? (
    <ImagemDaMidia
      variantes={slide.midia.variantes}
      alt={alt}
      largura={slide.midia.largura}
      altura={slide.midia.altura}
      sizes="100vw"
      celular={slide.midia.celular}
      tablet={slide.midia.tablet}
      prioridade={prioridade}
      className={`${estilos.imagem} ${foco}`}
    />
  ) : slide.imagem ? (
    // eslint-disable-next-line @next/next/no-img-element -- slides padrão do código (endereço provisório, sem a biblioteca)
    <img src={slide.imagem} alt={alt} className={estilos.imagem} />
  ) : null;

  const conteudo = texto ? (
    <div className={`${estilos.conteudo} ${CLASSE_DA_POSICAO[texto.posicao]}`}>
      {/* Container compartilhado com uma faixa livre para as setas laterais. */}
      <div className={`container ${estilos.linhaDoTexto}`}>
      <div className={estilos.caixaDeTexto}>
        {texto.titulo && (
          <TituloAjustavel className={estilos.tituloDoBanner}>
            {partesDoTitulo(texto.titulo, texto.trechoEmDestaque).map((parte, indice) =>
              parte.destaque ? (
                <strong key={indice} className={estilos.destaque}>
                  {parte.texto}
                </strong>
              ) : (
                <span key={indice}>{parte.texto}</span>
              ),
            )}
          </TituloAjustavel>
        )}
        {texto.subtitulo && <p className={estilos.subtituloDoBanner}>{texto.subtitulo}</p>}
        {comBotao && (
          <div className={estilos.acaoDoBanner}>
            {link ? (
              <Botao
                href={link.href}
                onClick={(evento) => irParaAncora(evento, link.href)}
                target={externo ? "_blank" : undefined}
                rel={externo ? "noopener noreferrer" : undefined}
                aria-label={externo ? `${texto.textoDoBotao} (abre em nova aba)` : undefined}
              >
                {texto.textoDoBotao} <span className="seta-para-frente" aria-hidden="true">&rarr;</span>
              </Botao>
            ) : (
              <Botao type="button" tabIndex={-1}>
                {texto.textoDoBotao} <span aria-hidden="true">&rarr;</span>
              </Botao>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  ) : null;

  const corpo = (
    <>
      {imagem}
      {conteudo}
    </>
  );
  const classeDoFormato = formato ? CLASSE_DO_FORMATO[formato] : "";
  if (link && !comBotao) {
    return externo ? (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={`${estilos.linkDoSlide} ${estilos.camadas} ${classeDoFormato}`} aria-label={`${link.nome} (abre em nova aba)`}>
        {corpo}
      </a>
    ) : (
      <Link href={link.href} onClick={(evento) => irParaAncora(evento, link.href)} className={`${estilos.linkDoSlide} ${estilos.camadas} ${classeDoFormato}`} aria-label={link.nome}>
        {corpo}
      </Link>
    );
  }
  return <div className={`${estilos.camadas} ${classeDoFormato}`}>{corpo}</div>;
}
