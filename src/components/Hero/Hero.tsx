"use client";

import { useState, useEffect } from "react";
import estilos from "./Hero.module.css";

type PropsHero = {
  imagens: string[];
  sobHeaderFixo?: boolean;
};

export function Hero({ imagens, sobHeaderFixo }: PropsHero) {
  const [slideAtual, setSlideAtual] = useState(0);

  const proximo = () => {
    setSlideAtual((atual) => (atual + 1) % imagens.length);
  };

  const anterior = () => {
    setSlideAtual((atual) => (atual === 0 ? imagens.length - 1 : atual - 1));
  };

  // Passagem automática
  useEffect(() => {
    const intervalo = setInterval(() => {
      setSlideAtual((atual) => (atual + 1) % imagens.length);
    }, 5000); // Muda a cada 5 segundos

    return () => clearInterval(intervalo);
  }, [imagens.length]);

  return (
    <section data-hero="" className={`${estilos.hero} ${sobHeaderFixo ? estilos.sobHeaderFixo : ""}`}>
      <div className={estilos.carrossel}>
        {imagens.map((img, index) => (
          <div
            key={index}
            className={`${estilos.slide} ${index === slideAtual ? estilos.ativo : ""}`}
            style={{ opacity: index === slideAtual ? 1 : 0, transition: "opacity 0.5s ease-in-out" }}
          >
            <img src={img} alt={`Slide ${index + 1}`} className={estilos.imagem} />
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
          {imagens.map((_, index) => (
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
