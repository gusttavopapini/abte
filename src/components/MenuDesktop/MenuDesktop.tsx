"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { ItemDoMenu } from "@/config/navegacao";
import { IconeSeta } from "@/components/Icones/Icones";
import estilos from "./MenuDesktop.module.css";

// Menu do header a partir de 1024px. Submenus no padrão "disclosure":
// botão com aria-expanded, abre com Enter ou Espaço, fecha com Esc, clique
// fora ou quando o foco sai do item.
export function MenuDesktop({ itens, rotulo, className }: { itens: ItemDoMenu[]; rotulo: string; className?: string }) {
  const [aberto, setAberto] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const botoesRef = useRef<(HTMLButtonElement | null)[]>([]);
  const prefixo = useId();

  useEffect(() => {
    if (aberto === null) return;
    const indice = aberto;
    function aoClicarFora(evento: PointerEvent) {
      if (!navRef.current?.contains(evento.target as Node)) setAberto(null);
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setAberto(null);
        botoesRef.current[indice]?.focus();
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
          if (!item.submenu) {
            return (
              <li key={item.rotulo}>
                <Link href={item.href ?? "/"} className={estilos.link}>
                  {item.rotulo}
                </Link>
              </li>
            );
          }

          const idSubmenu = `${prefixo}-submenu-${indice}`;
          const estaAberto = aberto === indice;
          const alternar = () => setAberto(estaAberto ? null : indice);
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
              onBlur={(evento) => {
                if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) {
                  setAberto((atual) => (atual === indice ? null : atual));
                }
              }}
            >
              {item.href ? (
                <span className={estilos.grupo}>
                  <Link href={item.href} className={estilos.link}>
                    {item.rotulo}
                  </Link>
                  <button {...botaoComum} className={estilos.seta} aria-label={`Submenu de ${item.rotulo}`}>
                    <IconeSeta className={estilos.icone} />
                  </button>
                </span>
              ) : (
                <button {...botaoComum} className={`${estilos.link} ${estilos.botaoTexto}`}>
                  {item.rotulo}
                  <IconeSeta className={estilos.icone} />
                </button>
              )}
              {estaAberto && (
                <ul role="list" id={idSubmenu} className={estilos.submenu}>
                  {item.submenu.map((sub) => (
                    <li key={sub.href}>
                      <Link href={sub.href} className={estilos.link} onClick={() => setAberto(null)}>
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
  );
}
