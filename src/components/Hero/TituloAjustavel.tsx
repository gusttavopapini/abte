"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

// Título do banner que nunca parte uma palavra (30/10/2026): mede a maior
// palavra (depois de as fontes carregarem e a cada mudança de largura) e, se
// ela não couber na linha, reduz o tamanho da fonte na proporção, com um
// piso de --space-24 (24px). Sem JavaScript, o CSS já é seguro (tamanho
// pelos tokens e nenhuma quebra no meio da palavra). Sem animação: a troca
// é feita antes da pintura, sem salto perceptível. Desde 31/10/2026, mede a
// largura na caixa do texto (o título centralizado encolhe até o conteúdo) e
// também reduz a fonte se título, subtítulo e botão não couberem na altura.
export function TituloAjustavel({ className, children }: { className?: string; children: ReactNode }) {
  const titulo = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const elemento = titulo.current;
    if (!elemento) return;
    const tela = document.createElement("canvas").getContext("2d");
    let cancelado = false;

    function ajustar() {
      if (!elemento || !tela || cancelado) return;
      // Volta ao tamanho do CSS antes de medir.
      elemento.style.fontSize = "";
      const estilo = getComputedStyle(elemento);
      const tamanho = parseFloat(estilo.fontSize);
      const caixa = elemento.parentElement;
      const disponivel = caixa?.clientWidth ?? elemento.clientWidth;
      if (!tamanho || !disponivel) return;
      const piso = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--space-24")) || 24;
      // A palavra mais larga, medida no peso mais forte usado no título.
      const pesoForte = Math.max(...[elemento, ...elemento.querySelectorAll("*")].map((parte) => Number(getComputedStyle(parte).fontWeight) || 400));
      tela.font = `${pesoForte} ${tamanho}px ${estilo.fontFamily}`;
      const maior = Math.max(0, ...(elemento.textContent ?? "").split(/\s+/).filter(Boolean).map((palavra) => tela.measureText(palavra).width));
      let atual = maior > disponivel ? Math.max(piso, Math.floor(tamanho * (disponivel / maior) * 0.98)) : tamanho;
      if (atual !== tamanho) elemento.style.fontSize = `${atual}px`;
      const area = elemento.closest<HTMLElement>("[data-area-do-texto]");
      if (!caixa || !area) return;
      const estiloDaArea = getComputedStyle(area);
      const livre = area.clientHeight - parseFloat(estiloDaArea.paddingTop) - parseFloat(estiloDaArea.paddingBottom);
      while (caixa.offsetHeight > livre && atual > piso) {
        atual = Math.max(piso, atual - 2);
        elemento.style.fontSize = `${atual}px`;
      }
    }

    window.addEventListener("resize", ajustar);
    ajustar();
    document.fonts?.ready.then(ajustar);
    const observador = new ResizeObserver(() => ajustar());
    if (elemento.parentElement) observador.observe(elemento.parentElement);
    return () => {
      cancelado = true;
      observador.disconnect();
      window.removeEventListener("resize", ajustar);
    };
  });

  return (
    <h2 ref={titulo} className={className}>
      {children}
    </h2>
  );
}
