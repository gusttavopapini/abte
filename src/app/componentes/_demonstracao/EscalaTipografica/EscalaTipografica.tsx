"use client";

import { useEffect, useRef, useState } from "react";
import estilos from "./EscalaTipografica.module.css";

const NIVEIS = [
  { token: "--font-size-display", classe: "tipo-display", nome: "Display" },
  { token: "--font-size-h1", classe: "tipo-h1", nome: "H1" },
  { token: "--font-size-h2", classe: "tipo-h2", nome: "H2" },
  { token: "--font-size-h3", classe: "tipo-h3", nome: "H3" },
  { token: "--font-size-text-xl", classe: "tipo-texto-xl", nome: "Texto extra grande" },
  { token: "--font-size-text-lg", classe: "tipo-texto-lg", nome: "Texto grande" },
  { token: "--font-size-text", classe: "tipo-texto", nome: "Texto" },
  { token: "--font-size-small", classe: "tipo-pequeno", nome: "Pequeno" },
];

const formato = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

// Mostra cada nível com o tamanho calculado agora, atualizado ao redimensionar.
export function EscalaTipografica() {
  const exemplos = useRef<(HTMLParagraphElement | null)[]>([]);
  const [tamanhos, setTamanhos] = useState<string[]>([]);
  const [largura, setLargura] = useState<number | null>(null);

  useEffect(() => {
    function medir() {
      setLargura(window.innerWidth);
      setTamanhos(exemplos.current.map((el) => (el ? formato.format(parseFloat(getComputedStyle(el).fontSize)) : "")));
    }
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  return (
    <div className={estilos.escala}>
      <p className={estilos.largura} aria-live="polite">
        Largura da janela agora: {largura === null ? "…" : `${largura}px`}
      </p>
      <ul role="list" className={estilos.lista}>
        {NIVEIS.map((nivel, indice) => (
          <li key={nivel.token} className={estilos.item}>
            <p className={estilos.info}>
              <strong>{nivel.nome}</strong> · <code>{nivel.token}</code> ·{" "}
              <span data-tamanho-token={nivel.token}>{tamanhos[indice] ? `${tamanhos[indice]}px` : "…"}</span>
            </p>
            <p
              ref={(el) => {
                exemplos.current[indice] = el;
              }}
              className={`${nivel.classe} ${estilos.exemplo}`}
            >
              Tratamento da escoliose
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
