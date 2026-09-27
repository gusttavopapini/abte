"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CHAMADA_DOACAO, MENU_PRINCIPAL } from "@/config/navegacao";
import { Botao } from "@/components/Botao/Botao";
import { IconeMenu } from "@/components/Icones/Icones";
import { Logo } from "@/components/Logo/Logo";
import { MenuDesktop } from "@/components/MenuDesktop/MenuDesktop";
import { MenuTelaCheia } from "@/components/MenuTelaCheia/MenuTelaCheia";
import estilos from "./Header.module.css";

export type VarianteHeader = "transparente" | "solida";

type PropsHeader = {
  // "transparente": só na home, sobre o hero. "solida": páginas internas.
  variante?: VarianteHeader;
  // Na página /componentes o header aparece como exemplo, sem ficar fixo.
  demonstracao?: boolean;
};

// Header do site (design-system.md seção 8.1).
// Fixo no topo (PROPOSTA). Na variante transparente, ganha o fundo
// --color-bg quando o hero (elemento com data-hero) sai da tela.
export function Header({ variante = "solida", demonstracao = false }: PropsHeader) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [heroSaiu, setHeroSaiu] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const hamburguerRef = useRef<HTMLButtonElement>(null);
  const idMenu = useId();
  const sufixo = demonstracao ? ", exemplo" : "";

  useEffect(() => {
    if (variante !== "transparente" || demonstracao) return;
    const hero = document.querySelector("[data-hero]");
    if (!hero) return;
    const alturaHeader = headerRef.current?.offsetHeight ?? 0;
    const observador = new IntersectionObserver(([entrada]) => setHeroSaiu(!entrada.isIntersecting), {
      rootMargin: `-${alturaHeader}px 0px 0px 0px`,
    });
    observador.observe(hero);
    return () => observador.disconnect();
  }, [variante, demonstracao]);

  const fecharMenu = useCallback((devolverFoco = true) => {
    setMenuAberto(false);
    // O foco volta para o botão que abriu o menu.
    if (devolverFoco) requestAnimationFrame(() => hamburguerRef.current?.focus());
  }, []);

  const classes = [
    estilos.header,
    variante === "transparente" ? estilos.transparente : estilos.solida,
    variante === "transparente" && heroSaiu ? estilos.comFundo : "",
    demonstracao ? estilos.demonstracao : "",
  ].join(" ");

  return (
    <header ref={headerRef} className={classes}>
      <div className={`container ${estilos.barra}`}>
        <div className={estilos.colunaEsquerda}>
          <Logo />
        </div>
        <div className={`${estilos.colunaCentro} ${estilos.somenteDesktop}`}>
          <MenuDesktop itens={MENU_PRINCIPAL} rotulo={`Menu principal${sufixo}`} />
        </div>
        <div className={estilos.colunaDireita}>
          <Botao href={CHAMADA_DOACAO.href} className={`${estilos.somenteDesktop} ${estilos.doe}`}>
            {CHAMADA_DOACAO.rotulo}
          </Botao>
          <button
            ref={hamburguerRef}
            type="button"
            className={estilos.hamburguer}
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            aria-controls={idMenu}
            onClick={() => setMenuAberto(true)}
          >
            <IconeMenu className={estilos.icone} />
          </button>
        </div>
      </div>
      {menuAberto && <MenuTelaCheia id={idMenu} rotulo={`Menu${sufixo}`} aoFechar={fecharMenu} />}
    </header>
  );
}
