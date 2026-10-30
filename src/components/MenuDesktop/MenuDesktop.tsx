"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent, useEffect, useId, useRef, useState } from "react";
import { itemEstaAtivo, linkEstaAtivo, type ItemDoMenu } from "@/config/navegacao";
import { IconeSeta } from "@/components/Icones/Icones";
import estilos from "./MenuDesktop.module.css";

// Atraso para fechar o submenu quando o ponteiro sai do item: dá tempo de
// levar o mouse do item até o submenu sem que ele feche no caminho.
const ATRASO_PARA_FECHAR_MS = 300;

// Menu do header a partir de 1024px. Submenus no padrão "disclosure":
// o item continua sendo link e a seta ao lado é o botão com aria-expanded.
// Abre ao passar o mouse, quando o foco entra no item (teclado), com clique,
// Enter ou Espaço na seta e, em telas de toque, no primeiro toque no item (o
// segundo toque segue o link). Fecha com Esc (o foco volta para a seta),
// clique fora, quando o foco sai do item ou pouco depois de o mouse sair.
export function MenuDesktop({ itens, rotulo, className }: { itens: ItemDoMenu[]; rotulo: string; className?: string }) {
  const [aberto, setAberto] = useState<number | null>(null);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const botoesRef = useRef<(HTMLButtonElement | null)[]>([]);
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Toque (ou caneta) no item com o submenu fechado: o clique que vem em
  // seguida abre o submenu em vez de seguir o link.
  const toqueAbreRef = useRef(false);
  // Foco devolvido à seta pelo Esc: não deve reabrir o submenu.
  const ignorarFocoRef = useRef(false);
  // Submenu aberto pela passagem do mouse: o clique do mouse na seta, que
  // vem logo depois, não deve fechá-lo.
  const abertoPeloMouseRef = useRef(false);
  const prefixo = useId();

  function cancelarFechamento() {
    clearTimeout(temporizadorRef.current);
  }

  function abrir(indice: number) {
    cancelarFechamento();
    setAberto(indice);
  }

  function fecharDepois(indice: number) {
    cancelarFechamento();
    temporizadorRef.current = setTimeout(() => setAberto((atual) => (atual === indice ? null : atual)), ATRASO_PARA_FECHAR_MS);
  }

  // Limpa o temporizador ao sair da página.
  useEffect(() => cancelarFechamento, []);

  useEffect(() => {
    if (aberto === null) {
      abertoPeloMouseRef.current = false;
      return;
    }
    const indice = aberto;
    function aoClicarFora(evento: PointerEvent) {
      if (!navRef.current?.contains(evento.target as Node)) setAberto(null);
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        cancelarFechamento();
        setAberto(null);
        ignorarFocoRef.current = true;
        botoesRef.current[indice]?.focus();
        ignorarFocoRef.current = false;
      }
    }
    document.addEventListener("pointerdown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("pointerdown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  return (
    <nav ref={navRef} aria-label={rotulo} className={className}>
      <ul role="list" className={estilos.lista}>
        {itens.map((item, indice) => {
          const ativo = itemEstaAtivo(pathname, item);

          const classesDoLink = `realce ${estilos.link} ${ativo ? estilos.linkAtivo : ""}`;

          if (!item.submenu) {
            return (
              <li key={item.rotulo}>
                <Link href={item.href ?? "/"} className={classesDoLink}>
                  {item.rotulo}
                </Link>
              </li>
            );
          }

          const idSubmenu = `${prefixo}-submenu-${indice}`;
          const estaAberto = aberto === indice;
          // Clique do mouse (detail > 0) num submenu aberto pela passagem do
          // mouse mantém aberto; o clique seguinte, Enter ou Espaço alternam.
          const alternar = (evento: MouseEvent<HTMLButtonElement>) => {
            if (estaAberto && evento.detail > 0 && abertoPeloMouseRef.current) {
              abertoPeloMouseRef.current = false;
              return;
            }
            if (estaAberto) setAberto(null);
            else abrir(indice);
          };
          const botaoComum = {
            ref: (elemento: HTMLButtonElement | null) => {
              botoesRef.current[indice] = elemento;
            },
            type: "button" as const,
            "aria-expanded": estaAberto,
            "aria-controls": idSubmenu,
            onClick: alternar,
          };

          return (
            <li
              key={item.rotulo}
              className={estilos.itemComSubmenu}
              // Só o mouse abre por passagem; no toque quem abre é o primeiro toque.
              onPointerEnter={(evento) => {
                if (evento.pointerType !== "mouse") return;
                if (!estaAberto) abertoPeloMouseRef.current = true;
                abrir(indice);
              }}
              onPointerLeave={(evento) => evento.pointerType === "mouse" && fecharDepois(indice)}
              onFocus={() => !ignorarFocoRef.current && abrir(indice)}
              onBlur={(evento) => {
                if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) {
                  cancelarFechamento();
                  setAberto((atual) => (atual === indice ? null : atual));
                }
              }}
            >
              {item.href ? (
                <span className={estilos.grupo}>
                  <Link
                    href={item.href}
                    className={classesDoLink}
                    onPointerDown={(evento) => {
                      toqueAbreRef.current = evento.pointerType !== "mouse" && !estaAberto;
                    }}
                    onClick={(evento) => {
                      if (!toqueAbreRef.current) return;
                      toqueAbreRef.current = false;
                      evento.preventDefault();
                      abrir(indice);
                    }}
                  >
                    {item.rotulo}
                  </Link>
                  <button {...botaoComum} className={`${estilos.seta} ${ativo ? estilos.setaAtiva : ""}`} aria-label={`Submenu de ${item.rotulo}`}>
                    <IconeSeta className={estilos.icone} />
                  </button>
                </span>
              ) : (
                <button {...botaoComum} className={`${classesDoLink} ${estilos.botaoTexto}`}>
                  {item.rotulo}
                  <IconeSeta className={estilos.icone} />
                </button>
              )}
              {estaAberto && (
                <ul role="list" id={idSubmenu} className={estilos.submenu}>
                  {item.submenu.map((sub) => {
                    const subAtivo = linkEstaAtivo(pathname, sub.href);
                    return (
                      <li key={sub.href}>
                        <Link href={sub.href} className={`realce ${estilos.link} ${subAtivo ? estilos.linkAtivo : ""}`} onClick={() => setAberto(null)}>
                          {sub.rotulo}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
