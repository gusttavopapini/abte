"use client";

import { useState } from "react";
import { PlaceholderImagem } from "../PlaceholderImagem/PlaceholderImagem";
import estilos from "./Hero.module.css";

type PropsHero = {
  imagens?: string[];
  sobHeaderFixo?: boolean;
};

export function Hero({ imagens = [], sobHeaderFixo }: PropsHero) {
  const [slideAtual, setSlideAtual] = useState(0);

  // Se não tem imagens, usa 3 de placeholder para demonstração do carrossel
  const imagensReais = imagens.length > 0 ? imagens : ["placeholder1", "placeholder2", "placeholder3"];

  const proximo = () => {
    setSlideAtual((atual) => (atual + 1) % imagensReais.length);
  };

  const anterior = () => {
    setSlideAtual((atual) => (atual === 0 ? imagensReais.length - 1 : atual - 1));
  };

  return (
    <section data-hero="" className={`${estilos.hero} ${sobHeaderFixo ? estilos.sobHeaderFixo : ""}`}>
      <div className={estilos.carrossel}>
        {imagensReais.map((img, index) => (
          <div
            key={index}
            className={`${estilos.slide} ${index === slideAtual ? estilos.ativo : ""}`}
            style={{ opacity: index === slideAtual ? 1 : 0, transition: "opacity 0.5s ease-in-out" }}
          >
            {img.startsWith("placeholder") ? (
              <div style={{ width: "100%", height: "100%", background: `hsl(${index * 40 + 200}, 50%, 40%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "2rem" }}>
                Slide {index + 1}
              </div>
            ) : (
              <img src={img} alt={`Slide ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
        ))}

        {/* Setas de navegação */}
        <button className={`${estilos.seta} ${estilos.setaEsquerda}`} onClick={anterior} aria-label="Anterior">
          &#10094;
        </button>
        <button className={`${estilos.seta} ${estilos.setaDireita}`} onClick={proximo} aria-label="Próximo">
          &#10095;
        </button>

        {/* Contadores / Dots */}
        <div className={estilos.dotsContainer}>
          {imagensReais.map((_, index) => (
            <button
              key={index}
              className={`${estilos.dot} ${index === slideAtual ? estilos.dotAtivo : ""}`}
              onClick={() => setSlideAtual(index)}
              aria-label={`Ir para o slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
