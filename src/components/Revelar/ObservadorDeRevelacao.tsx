"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Mostra cada bloco marcado com revelar() quando ele entra na tela.
// Avisa o script do <head> que está ativo (data-revelacao-pronta): se este
// código não carregar, o script tira a marca .movimento e nada fica escondido.
// Desde 08/11/2026, os blocos já na tela ao abrir a página são marcados
// visíveis antes (data-imediato, sem animação): nada acima da dobra fica
// escondido nem anima no carregamento, e o CSS só esconde depois da marca.
export function ObservadorDeRevelacao() {
  const pathname = usePathname();

  useEffect(() => {
    const raiz = document.documentElement;
    const blocos = [...document.querySelectorAll("[data-revelar]:not([data-visivel])")];
    const alturaDaTela = window.innerHeight;
    for (const bloco of blocos) {
      const caixa = bloco.getBoundingClientRect();
      if (caixa.top < alturaDaTela && caixa.bottom > 0) {
        bloco.setAttribute("data-imediato", "");
        bloco.setAttribute("data-visivel", "");
      }
    }
    raiz.setAttribute("data-revelacao-pronta", "");
    if (!raiz.classList.contains("movimento")) return;

    const observador = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        entrada.target.setAttribute("data-visivel", "");
        observador.unobserve(entrada.target);
      }
    });
    document.querySelectorAll("[data-revelar]:not([data-visivel])").forEach((bloco) => observador.observe(bloco));
    return () => observador.disconnect();
  }, [pathname]);

  return null;
}
