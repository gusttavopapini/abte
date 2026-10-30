"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef } from "react";
import estilos from "./Modal.module.css";

type PropsModal = {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
  // "larga" para conteúdo maior (popup dos profissionais); o padrão é 500px.
  largura?: "padrao" | "larga";
  // Onde o foco entra ao abrir: no primeiro campo do conteúdo (padrão) ou no
  // botão de fechar, quando o conteúdo é longo e começa com texto.
  focoInicial?: "conteudo" | "fechar";
};

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Janelas abertas, da mais antiga para a mais nova (30/10/2026): com uma
// janela aberta dentro de outra (ex.: a confirmação dentro das Configurações
// do site), só a de cima responde ao Esc, e a página volta a rolar só quando
// a última fecha.
const pilha: symbol[] = [];

// Janela sobre a página. Acessível por teclado: Esc fecha, o foco entra no
// primeiro campo ao abrir, fica preso dentro da janela e volta para quem a
// abriu ao fechar. A página de fundo não rola.
export function Modal({ aberto, aoFechar, titulo, children, largura = "padrao", focoInicial = "conteudo" }: PropsModal) {
  const idTitulo = useId();
  const janelaRef = useRef<HTMLDivElement>(null);
  // aoFechar muda a cada renderização de quem usa o Modal; a referência evita
  // repetir o efeito (e roubar o foco) enquanto a janela está aberta.
  const aoFecharRef = useRef(aoFechar);
  const focoInicialRef = useRef(focoInicial);
  useEffect(() => {
    aoFecharRef.current = aoFechar;
    focoInicialRef.current = focoInicial;
  }, [aoFechar, focoInicial]);

  useEffect(() => {
    if (!aberto) return;
    const quemAbriu = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const eu = Symbol("janela");
    pilha.push(eu);
    document.body.style.overflow = "hidden";

    const focaveis = janelaRef.current?.querySelectorAll<HTMLElement>(FOCAVEIS);
    // O primeiro focável é o botão de fechar; o foco vai para o primeiro campo
    // ou botão do conteúdo, se houver, ou fica no fechar, se pedido.
    (focoInicialRef.current === "fechar" ? focaveis?.[0] : focaveis?.[1] ?? focaveis?.[0])?.focus();

    function aoTeclar(evento: globalThis.KeyboardEvent) {
      if (evento.key === "Escape" && pilha[pilha.length - 1] === eu) aoFecharRef.current();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      pilha.splice(pilha.indexOf(eu), 1);
      if (pilha.length === 0) document.body.style.overflow = "";
      document.removeEventListener("keydown", aoTeclar);
      quemAbriu?.focus();
    };
  }, [aberto]);

  // Mantém o Tab circulando só entre os elementos da janela.
  function prenderFoco(evento: KeyboardEvent<HTMLDivElement>) {
    // Esc dentro da janela: fecha só esta e não chega a quem está por fora
    // (ex.: a gaveta do menu do painel).
    if (evento.key === "Escape") {
      evento.stopPropagation();
      aoFecharRef.current();
      return;
    }
    if (evento.key !== "Tab" || !janelaRef.current) return;
    // A janela de dentro cuida do próprio Tab; a de fora não o trata de novo.
    evento.stopPropagation();
    const focaveis = Array.from(janelaRef.current.querySelectorAll<HTMLElement>(FOCAVEIS));
    if (focaveis.length === 0) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }

  if (!aberto) return null;

  return (
    <div className={estilos.overlay} onClick={aoFechar}>
      <div
        ref={janelaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className={`${estilos.modal} ${largura === "larga" ? estilos.larga : ""}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={prenderFoco}
      >
        <header className={estilos.cabecalho}>
          <h2 id={idTitulo} className={estilos.titulo}>{titulo}</h2>
          <button type="button" className={estilos.botaoFechar} onClick={aoFechar} aria-label="Fechar">
            &times;
          </button>
        </header>
        <div className={estilos.conteudo}>
          {children}
        </div>
      </div>
    </div>
  );
}
