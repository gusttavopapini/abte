"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { escolherVariante } from "@/lib/midia/regras";
import type { VarianteNaTela } from "@/lib/midia/tela";
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
};

// Imagem da biblioteca de mídia. Usa as variantes WebP já geradas (480, 960 e
// 1600 px): o carregador próprio só escolhe a mais leve que cobre a largura
// pedida, sem passar pela otimização de imagens da Vercel (sem custo nem cota).
export function ImagemDaMidia({ variantes, alt, largura, altura, sizes, prioridade, className }: Props) {
  const maior = escolherVariante(variantes, Number.POSITIVE_INFINITY);
  if (!maior || largura <= 0 || altura <= 0) return null;
  const carregador = ({ width }: ImageLoaderProps) => escolherVariante(variantes, width)?.url ?? maior.url;
  return (
    <Image
      loader={carregador}
      src={maior.url}
      alt={alt}
      width={largura}
      height={altura}
      sizes={sizes}
      priority={prioridade}
      className={`${estilos.imagem} ${className ?? ""}`}
    />
  );
}
