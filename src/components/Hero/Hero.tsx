"use client";

import { useState, useEffect } from "react";
import type { SlideDoBanner } from "@/lib/site/banners";
import { ConteudoDoSlide } from "./ConteudoDoSlide";
import estilos from "./Hero.module.css";

type PropsHero = {
  // Slides configurados em src/lib/site/banners.ts; com destino, o slide
  // inteiro vira link (29/10/2026).
  slides: SlideDoBanner[];
  sobHeaderFixo?: boolean;
};

// Intervalo entre os slides na passagem automática, em milissegundos.
const INTERVALO_DO_CARROSSEL_MS = 6000;

export function Hero({ slides, sobHeaderFixo }: PropsHero) {
  const [slideAtual, setSlideAtual] = useState(0);
  // Motivos para não avançar sozinho: mouse sobre o banner, foco dentro dele,
  // aba oculta e movimento reduzido.
  const [mouseEmCima, setMouseEmCima] = useState(false);
  const [focoDentro, setFocoDentro] = useState(false);
  const [abaOculta, setAbaOculta] = useState(false);
  const [movimentoReduzido, setMovimentoReduzido] = useState(false);

  const proximo = () => {
    setSlideAtual((atual) => (atual + 1) % slides.length);
  };

  const anterior = () => {
    setSlideAtual((atual) => (atual === 0 ? slides.length - 1 : atual - 1));
  };

  // Acompanha o movimento reduzido e a visibilidade da aba, também se
  // mudarem com a página aberta.
  useEffect(() => {
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lerReduzido = () => setMovimentoReduzido(reduzido.matches);
    const lerAba = () => setAbaOculta(document.visibilityState === "hidden");
    lerReduzido();
    lerAba();
    reduzido.addEventListener("change", lerReduzido);
    document.addEventListener("visibilitychange", lerAba);
    return () => {
      reduzido.removeEventListener("change", lerReduzido);
      document.removeEventListener("visibilitychange", lerAba);
    };
  }, []);

  // Passagem automática, em loop. A contagem recomeça a cada troca de slide
  // (também quando a troca vem das setas ou dos pontos) e para enquanto
  // houver motivo de pausa. As setas e os pontos funcionam sempre.
  const pausado = mouseEmCima || focoDentro || abaOculta || movimentoReduzido;
  useEffect(() => {
    if (pausado || slides.length < 2) return;
    const temporizador = setTimeout(() => setSlideAtual((atual) => (atual + 1) % slides.length), INTERVALO_DO_CARROSSEL_MS);
    return () => clearTimeout(temporizador);
  }, [pausado, slideAtual, slides.length]);

  return (
    <section
      data-hero=""
      className={`${estilos.hero} ${sobHeaderFixo ? estilos.sobHeaderFixo : ""}`}
      // Só o mouse pausa por passagem: no toque, o "ponteiro em cima" não termina.
      onPointerEnter={(evento) => evento.pointerType === "mouse" && setMouseEmCima(true)}
      onPointerLeave={(evento) => evento.pointerType === "mouse" && setMouseEmCima(false)}
      // Pausa com foco de teclado; o foco que fica na seta depois de um
      // clique do mouse não pausa, senão o banner pararia de vez.
      onFocus={(evento) => setFocoDentro(evento.target.matches(":focus-visible"))}
      onBlur={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setFocoDentro(false);
      }}
    >
      <div className={estilos.carrossel}>
        {/* Só o slide atual fica acessível; os outros ficam inertes (nem o
            link deles recebe foco). Setas e pontos ficam fora dos links. */}
        {slides.map((slide, index) => {
          const ativo = index === slideAtual;
          return (
            <div
              key={index}
              className={`${estilos.slide} ${ativo ? estilos.ativo : ""}`}
              style={{ opacity: ativo ? 1 : 0, transition: "opacity 0.5s ease-in-out" }}
              inert={!ativo}
              aria-hidden={!ativo || undefined}
            >
              <ConteudoDoSlide slide={slide} prioridade={index === 0} />
            </div>
          );
        })}

        {/* Setas de navegação */}
        <button type="button" className={`${estilos.seta} ${estilos.setaEsquerda}`} onClick={anterior} aria-label="Slide anterior">
          &#10094;
        </button>
        <button type="button" className={`${estilos.seta} ${estilos.setaDireita}`} onClick={proximo} aria-label="Próximo slide">
          &#10095;
        </button>

        {/* Contadores / Dots */}
        <div className={estilos.dotsContainer}>
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
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
