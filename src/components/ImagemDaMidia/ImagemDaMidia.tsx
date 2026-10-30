"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { escolherVariante } from "@/lib/midia/regras";
import { fontesPorFaixa } from "@/lib/midia/versoes";
import type { ImagemNaTela, VarianteNaTela } from "@/lib/midia/tela";
import estilos from "./ImagemDaMidia.module.css";

type Props = {
  variantes: VarianteNaTela[];
  alt: string;
  // Medidas da imagem (proporção), para reservar o espaço e evitar saltos.
  largura: number;
  altura: number;
  // Largura ocupada na tela, para o navegador escolher a variante (atributo sizes).
  sizes: string;
  prioridade?: boolean;
  className?: string;
  // Versão para celular (imagens da home, 30/10/2026): com ela, a imagem vira
  // um <picture> e cada visitante baixa só a versão da sua tela (até 767px,
  // a de celular). Sem ela, tudo como antes.
  celular?: ImagemNaTela | null;
  sizesCelular?: string;
  // Versão para tablet, de 768 a 1023 px (banners da home, 30/10/2026).
  // Cadeia de substituição: o celular usa a de tablet e, sem ela, a de
  // computador; o tablet usa a de computador.
  tablet?: ImagemNaTela | null;
};

// Larguras que separam as versões: os breakpoints literais do site.
const MIDIA_DO_CELULAR = "(max-width: 767px)";
const MIDIA_DO_TABLET = "(max-width: 1023px)";
// Celular: variantes até 960 px; computador: de 960 px para cima.
const LIMITE_DAS_VERSOES = 960;

function listaDoSrcset(variantes: VarianteNaTela[]): string {
  return variantes.map((variante) => `${variante.url} ${variante.largura}w`).join(", ");
}

function variantesDoCelular(variantes: VarianteNaTela[]): VarianteNaTela[] {
  const ate = variantes.filter((variante) => variante.largura <= LIMITE_DAS_VERSOES);
  return ate.length > 0 ? ate : [...variantes].sort((a, b) => a.largura - b.largura).slice(0, 1);
}

function variantesDoComputador(variantes: VarianteNaTela[]): VarianteNaTela[] {
  const desde = variantes.filter((variante) => variante.largura >= LIMITE_DAS_VERSOES);
  return desde.length > 0 ? desde : variantes;
}

// Imagem da biblioteca de mídia. Usa as variantes WebP já geradas (480, 960 e
// 1600 px): o carregador próprio só escolhe a mais leve que cobre a largura
// pedida, sem passar pela otimização de imagens da Vercel (sem custo nem cota).
export function ImagemDaMidia({ variantes, alt, largura, altura, sizes, prioridade, className, celular, sizesCelular = "100vw", tablet }: Props) {
  const maior = escolherVariante(variantes, Number.POSITIVE_INFINITY);
  if (!maior || largura <= 0 || altura <= 0) return null;
  const { celular: paraCelular, tablet: paraTablet } = fontesPorFaixa({ celular, tablet });
  if (paraCelular || paraTablet) {
    const doComputador = variantesDoComputador(variantes);
    // Os <source> vêm do mais estreito para o mais largo: o navegador escolhe
    // uma fonte só e baixa um arquivo só. width e height de cada fonte
    // reservam o espaço.
    return (
      <picture className={estilos.moldura}>
        {paraCelular && <source media={MIDIA_DO_CELULAR} srcSet={listaDoSrcset(variantesDoCelular(paraCelular.variantes))} sizes={sizesCelular} width={paraCelular.largura} height={paraCelular.altura} />}
        {paraTablet && <source media={MIDIA_DO_TABLET} srcSet={listaDoSrcset(paraTablet.variantes)} sizes={sizesCelular} width={paraTablet.largura} height={paraTablet.altura} />}
        <img
          src={(escolherVariante(doComputador, LIMITE_DAS_VERSOES) ?? maior).url}
          srcSet={listaDoSrcset(doComputador)}
          sizes={sizes}
          alt={alt}
          width={largura}
          height={altura}
          loading={prioridade ? "eager" : "lazy"}
          fetchPriority={prioridade ? "high" : undefined}
          decoding="async"
          className={`${estilos.imagem} ${className ?? ""}`}
        />
      </picture>
    );
  }
  const carregador = ({ width }: ImageLoaderProps) => escolherVariante(variantes, width)?.url ?? maior.url;
  return (
    <Image
      loader={carregador}
      src={maior.url}
      alt={alt}
      width={largura}
      height={altura}
      sizes={sizes}
      // "priority" foi descontinuado no Next.js 16; para a imagem principal da
      // página, a documentação indica carregar já e com prioridade alta.
      loading={prioridade ? "eager" : undefined}
      fetchPriority={prioridade ? "high" : undefined}
      className={`${estilos.imagem} ${className ?? ""}`}
    />
  );
}
