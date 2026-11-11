"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ancoraDoLink, type AncoraDaHome } from "@/lib/site/ancoras";
import { enquadrarBloco } from "@/lib/site/enquadramento";

const quadro = () => new Promise<void>((resolver) => requestAnimationFrame(() => resolver()));
const pausa = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

function movimentoReduzido(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Valor em px de uma variável CSS do <html> (publicada pelo Header ou token).
function variavelEmPx(nome: string, padrao: number): number {
  const valor = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(nome));
  return Number.isFinite(valor) ? valor : padrao;
}

// Espera as fontes e as imagens sem carregamento preguiçoso que vêm antes do
// alvo (o banner, por exemplo), para o layout não mudar depois da rolagem.
// No máximo 4 segundos; as preguiçosas já têm o espaço reservado.
async function esperarLayout(alvo: Element): Promise<void> {
  const imagens = Array.from(document.images).filter(
    (imagem) => !imagem.complete && imagem.loading !== "lazy" && imagem.compareDocumentPosition(alvo) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
  const carregadas = Promise.all([
    document.fonts?.ready,
    ...imagens.map((imagem) => new Promise((resolver) => {
      imagem.addEventListener("load", resolver, { once: true });
      imagem.addEventListener("error", resolver, { once: true });
    })),
  ]);
  await Promise.race([carregadas, pausa(4000)]);
  await quadro();
  await quadro();
}

// Espera a rolagem parar (3 quadros seguidos na mesma posição), até 2 s.
async function esperarRolagemParar(): Promise<void> {
  let anterior = -1;
  let parados = 0;
  const limite = performance.now() + 2000;
  while (parados < 3 && performance.now() < limite) {
    await quadro();
    const atual = window.scrollY;
    parados = atual === anterior ? parados + 1 : 0;
    anterior = atual;
  }
}

// Destino da rolagem para centralizar o bloco na área visível (a janela
// menos o header, se ele estiver aparecendo ao fim da rolagem), pela altura
// real do header (--altura-do-header).
function destinoCentralizado(bloco: HTMLElement): number {
  const caixa = bloco.getBoundingClientRect();
  const header = document.querySelector("header");
  return enquadrarBloco({
    topoDoBloco: caixa.top + window.scrollY,
    alturaDoBloco: caixa.height,
    rolagemAtual: window.scrollY,
    rolagemMaxima: document.documentElement.scrollHeight - window.innerHeight,
    alturaDaJanela: window.innerHeight,
    alturaDoHeader: variavelEmPx("--altura-do-header", header?.offsetHeight ?? 0),
    headerVisivelAgora: (header?.getBoundingClientRect().bottom ?? 0) > 0,
    margem: variavelEmPx("--space-24", 24),
  }).destino;
}

// Leva até a âncora: rola (suave, ou direto com movimento reduzido) e põe o
// foco. Bloco com data-ancora-centralizada (Quem Somos): centralizado e
// focado ele mesmo, com uma correção se o layout mudar durante a rolagem.
// Seções: topo no início (scroll-margin-top do CSS) e foco no h2.
async function irParaAncora(id: AncoraDaHome, esperar: boolean): Promise<boolean> {
  const alvo = document.getElementById(id);
  if (!alvo) return false;
  if (esperar) await esperarLayout(alvo);
  const comportamento: ScrollBehavior = movimentoReduzido() ? "auto" : "smooth";

  if (!alvo.hasAttribute("data-ancora-centralizada")) {
    alvo.scrollIntoView({ behavior: comportamento, block: "start" });
    alvo.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    return true;
  }

  // Foco antes de rolar: um foco de teclado que ficasse no header o
  // impediria de se esconder e mudaria a área visível.
  alvo.focus({ preventScroll: true });
  window.scrollTo({ top: destinoCentralizado(alvo), behavior: comportamento });
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    await esperarRolagemParar();
    const destino = destinoCentralizado(alvo);
    if (Math.abs(destino - window.scrollY) <= 2) break;
    window.scrollTo({ top: destino, behavior: "auto" });
  }
  return true;
}

// Âncora da home pedida por um link ("/#quem-somos" ou "#quem-somos"), ou null.
function ancoraDoElemento(link: HTMLAnchorElement): AncoraDaHome | null {
  if (link.target && link.target !== "_self") return null;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin || url.pathname !== "/" || url.search) return null;
  return ancoraDoLink(url.hash);
}

// Links para as âncoras da home (menu do desktop, menu em tela cheia,
// rodapé e botão do banner), num lugar só (11/11/2026).
// - Na home: o clique só rola, põe o foco e grava o "#". Ouvinte na fase de
//   captura do documento, antes do Link do Next.js, que vê o preventDefault
//   e não navega. Espera dois quadros, para o menu em tela cheia fechar e
//   soltar a rolagem da página antes de rolar.
// - Em outra página: o Link leva a "/#âncora"; ao chegar, depois das fontes
//   e das imagens, a mesma rolagem. Também ao abrir o endereço direto e na
//   troca só do "#" (hashchange).
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
      if (window.location.hash !== `#${id}`) window.history.pushState(null, "", `#${id}`);
      requestAnimationFrame(() => requestAnimationFrame(() => void irParaAncora(id, false)));
    }
    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;
    function chegar() {
      const id = ancoraDoLink(window.location.hash);
      if (id) void irParaAncora(id, true);
    }
    chegar();
    window.addEventListener("hashchange", chegar);
    return () => window.removeEventListener("hashchange", chegar);
  }, [pathname]);

  return null;
}
