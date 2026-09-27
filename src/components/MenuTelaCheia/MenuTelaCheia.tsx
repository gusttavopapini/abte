"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CHAMADA_DOACAO, MENU_PRINCIPAL } from "@/config/navegacao";
import { Botao } from "@/components/Botao/Botao";
import { IconeFechar, IconeSeta } from "@/components/Icones/Icones";
import { Logo } from "@/components/Logo/Logo";
import estilos from "./MenuTelaCheia.module.css";

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Menu em tela cheia, abaixo de 1024px (design-system.md seção 8.1).
// Foco preso dentro do menu, Esc fecha, a página de fundo não rola.
export function MenuTelaCheia({
  id,
  rotulo,
  aoFechar,
}: {
  id: string;
  rotulo: string;
  aoFechar: (devolverFoco?: boolean) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const [expandido, setExpandido] = useState<number | null>(null);
  const prefixo = useId();

  useEffect(() => {
    fecharRef.current?.focus();

    // Trava a rolagem da página de fundo.
    const raiz = document.documentElement;
    const overflowAnterior = raiz.style.overflow;
    raiz.style.overflow = "hidden";

    function aoTeclar(evento: globalThis.KeyboardEvent) {
      if (evento.key === "Escape") aoFechar();
    }
    // Se a tela passar de 1024px, o menu some e o header volta ao normal.
    const desktop = window.matchMedia("(min-width: 1024px)");
    function aoMudarTela(evento: MediaQueryListEvent) {
      if (evento.matches) aoFechar(false);
    }
    document.addEventListener("keydown", aoTeclar);
    desktop.addEventListener("change", aoMudarTela);
    return () => {
      raiz.style.overflow = overflowAnterior;
      document.removeEventListener("keydown", aoTeclar);
      desktop.removeEventListener("change", aoMudarTela);
    };
  }, [aoFechar]);

  // Mantém o Tab circulando só entre os elementos do menu.
  function prenderFoco(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== "Tab" || !menuRef.current) return;
    const focaveis = Array.from(menuRef.current.querySelectorAll<HTMLElement>(FOCAVEIS));
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

  const fechar = () => aoFechar(false);

  return (
    <div
      ref={menuRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={rotulo}
      className={estilos.menu}
      onKeyDown={prenderFoco}
    >
      <div className={`container ${estilos.topo}`}>
        <Logo aoClicar={fechar} />
        <button ref={fecharRef} type="button" className={estilos.fechar} aria-label="Fechar menu" onClick={() => aoFechar()}>
          <IconeFechar className={estilos.iconeFechar} />
        </button>
      </div>

      <div className={`container ${estilos.corpo}`}>
        <nav aria-label="Menu principal">
          <ul role="list" className={estilos.lista}>
            {MENU_PRINCIPAL.map((item, indice) => {
              if (!item.submenu) {
                return (
                  <li key={item.rotulo}>
                    <Link href={item.href ?? "/"} className={estilos.link} onClick={fechar}>
                      {item.rotulo}
                    </Link>
                  </li>
                );
              }

              const idSublista = `${prefixo}-sublista-${indice}`;
              const estaExpandido = expandido === indice;
              const botaoComum = {
                type: "button" as const,
                "aria-expanded": estaExpandido,
                "aria-controls": idSublista,
                onClick: () => setExpandido(estaExpandido ? null : indice),
              };

              return (
                <li key={item.rotulo}>
                  {item.href ? (
                    <span className={estilos.grupo}>
                      <Link href={item.href} className={estilos.link} onClick={fechar}>
                        {item.rotulo}
                      </Link>
                      <button {...botaoComum} className={estilos.alternar} aria-label={`Submenu de ${item.rotulo}`}>
                        <IconeSeta className={estilos.iconeSeta} />
                      </button>
                    </span>
                  ) : (
                    <button {...botaoComum} className={`${estilos.link} ${estilos.botaoTexto}`}>
                      {item.rotulo}
                      <IconeSeta className={estilos.iconeSeta} />
                    </button>
                  )}
                  {estaExpandido && (
                    <ul role="list" id={idSublista} className={estilos.sublista}>
                      {item.submenu.map((sub) => (
                        <li key={sub.href}>
                          <Link href={sub.href} className={estilos.link} onClick={fechar}>
                            {sub.rotulo}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <Botao href={CHAMADA_DOACAO.href} onClick={fechar}>
          {CHAMADA_DOACAO.rotulo}
        </Botao>
      </div>
    </div>
  );
}
