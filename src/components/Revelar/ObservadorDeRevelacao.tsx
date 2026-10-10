"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Mostra cada bloco marcado com revelar() quando ele entra na tela.
// Avisa o script do <head> que está ativo (data-revelacao-pronta): se este
// código não carregar, o script tira a marca .movimento e nada fica escondido.
export function ObservadorDeRevelacao() {
  const pathname = usePathname();

  useEffect(() => {
    const raiz = document.documentElement;
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
