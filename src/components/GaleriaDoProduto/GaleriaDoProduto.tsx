"use client";

import { useState } from "react";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import type { ImagemNaTela } from "@/lib/midia/tela";
import estilos from "./GaleriaDoProduto.module.css";

type Props = {
  // Imagens fora da lixeira, na ordem da galeria (a primeira é a principal).
  imagens: ImagemNaTela[];
};

// Galeria da página de produto (08/11/2026, no molde de loja virtual): a
// imagem principal 1:1, inteira (sem recorte) sobre branco, e, com mais de
// uma imagem, as miniaturas: em coluna à esquerda a partir de 1024px e em
// linha, abaixo, até 1023px. Cada miniatura é um botão (mouse, toque, Tab e
// Enter ou Espaço) com o nome "Ver imagem N de M"; a atual fica marcada
// (aria-current e contorno). O alt de cada imagem é o da biblioteca de mídia.
export function GaleriaDoProduto({ imagens }: Props) {
  const [atual, setAtual] = useState(0);
  const destaque = imagens[atual] ?? imagens[0];

  if (!destaque) {
    return (
      <div className={estilos.galeria}>
        <div className={estilos.destaque}>
          <PlaceholderImagem />
        </div>
      </div>
    );
  }

  const comMiniaturas = imagens.length > 1;
  return (
    <div className={`${estilos.galeria} ${comMiniaturas ? estilos.comMiniaturas : ""}`}>
      <div className={estilos.destaque}>
        <ImagemDaMidia
          key={atual}
          variantes={destaque.variantes}
          alt={destaque.alt}
          largura={destaque.largura}
          altura={destaque.altura}
          sizes="(max-width: 1023px) 100vw, 45vw"
          prioridade={atual === 0}
          className={estilos.imagem}
        />
      </div>
      {comMiniaturas && (
        <ul role="list" aria-label="Imagens do produto" className={estilos.miniaturas}>
          {imagens.map((imagem, indice) => (
            <li key={indice}>
              <button
                type="button"
                className={estilos.miniatura}
                onClick={() => setAtual(indice)}
                aria-current={indice === atual ? "true" : undefined}
                aria-label={`Ver imagem ${indice + 1} de ${imagens.length}`}
              >
                <ImagemDaMidia variantes={imagem.variantes} alt="" largura={imagem.largura} altura={imagem.altura} sizes="96px" className={estilos.imagem} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
