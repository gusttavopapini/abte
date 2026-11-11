"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ancoraDoLink, type AncoraDaHome } from "@/lib/site/ancoras";

// Rola até a seção da home (suave, ou direto com movimento reduzido) e põe
// o foco no título (h2 com tabindex -1), sem uma segunda rolagem.
function irParaSecao(id: AncoraDaHome, comportamento: "suave" | "direto") {
  const secao = document.getElementById(id);
  if (!secao) return false;
  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  secao.scrollIntoView({ behavior: comportamento === "suave" && !reduzido ? "smooth" : "auto", block: "start" });
  secao.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  return true;
}

// Âncora da home pedida por um link ("/#quem-somos" ou "#quem-somos"), ou null.
function ancoraDoElemento(link: HTMLAnchorElement): AncoraDaHome | null {
  if (link.target && link.target !== "_self") return null;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin || url.pathname !== "/" || url.search) return null;
  return ancoraDoLink(url.hash);
}

// Links para as seções da home (menu do desktop, menu em tela cheia, rodapé
// e botão do banner), num lugar só (11/11/2026; antes, só o banner, desde
// 30/10/2026).
// - Na home: o clique só rola até a seção, foca o título e atualiza o
//   endereço. Ouvinte na fase de captura do documento, antes do Link do
//   Next.js, que vê o preventDefault e não navega. A rolagem espera dois
//   quadros, para o menu em tela cheia fechar e soltar a rolagem da página.
// - Em outra página: o Link leva a "/#âncora" normalmente; ao chegar na
//   home, o título da seção recebe o foco.
export function NavegacaoPorAncora() {
  const pathname = usePathname();

  useEffect(() => {
    function aoClicar(evento: MouseEvent) {
      if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
      if (window.location.pathname !== "/") return;
      const link = (evento.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const id = ancoraDoElemento(link);
      if (!id || !document.getElementById(id)) return;
      evento.preventDefault();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (irParaSecao(id, "suave") && window.location.hash !== `#${id}`) window.history.pushState(null, "", `#${id}`);
        }),
      );
    }
    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, []);

  // Chegada à home com "#âncora" (de outra página ou pelo endereço digitado)
  // e troca só do "#" na barra de endereço ou pelo voltar do navegador.
  useEffect(() => {
    if (pathname !== "/") return;
    let quadro = 0;
    function chegar() {
      const id = ancoraDoLink(window.location.hash);
      if (!id) return;
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => irParaSecao(id, "suave"));
    }
    chegar();
    window.addEventListener("hashchange", chegar);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("hashchange", chegar);
    };
  }, [pathname]);

  return null;
}
