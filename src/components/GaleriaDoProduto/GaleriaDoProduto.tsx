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

// Galeria da página de produto: a imagem em destaque (3:4) e, com mais de uma,
// miniaturas que trocam o destaque. As miniaturas são botões (teclado: Tab e
// Enter ou Espaço), com o alt de cada imagem; a atual fica marcada.
export function GaleriaDoProduto({ imagens }: Props) {
  const [atual, setAtual] = useState(0);
  const destaque = imagens[atual] ?? imagens[0];

  if (!destaque) {
    return (
      <div className={estilos.destaque}>
        <PlaceholderImagem />
      </div>
    );
  }

  return (
    <div className={estilos.galeria}>
      <div className={estilos.destaque}>
        <ImagemDaMidia
          key={atual}
          variantes={destaque.variantes}
          alt={destaque.alt}
          largura={destaque.largura}
          altura={destaque.altura}
          sizes="(max-width: 767px) 100vw, 50vw"
          prioridade={atual === 0}
          className={estilos.imagem}
        />
      </div>
      {imagens.length > 1 && (
        <ul role="list" aria-label="Imagens do produto" className={estilos.miniaturas}>
          {imagens.map((imagem, indice) => (
            <li key={indice}>
              <button
                type="button"
                className={estilos.miniatura}
                onClick={() => setAtual(indice)}
                aria-pressed={indice === atual}
                aria-label={`Mostrar imagem ${indice + 1} de ${imagens.length}: ${imagem.alt}`}
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
