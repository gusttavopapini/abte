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

// Rolagem (em px) a partir da qual o header pode se esconder e ganha fundo
// sólido; acima dela, o header fica como no topo da página.
const LIMITE_DE_ROLAGEM_PX = 80;
// Movimentos menores que isto são ignorados, para o header não piscar com
// pequenas oscilações da rolagem (trackpad).
const TOLERANCIA_DE_ROLAGEM_PX = 8;

// Header do site (design-system.md seção 8.1).
// Fixo no topo (PROPOSTA). Esconde ao rolar para baixo e volta ao rolar para
// cima. Depois de rolar, quando visível, ganha fundo --color-bg para não
// ficar transparente sobre o conteúdo (exceção de design pendente). Nunca se
// esconde com o menu em tela cheia ou um submenu aberto (algum
// aria-expanded="true" dentro dele) nem com o foco de teclado dentro dele.
export function Header({ variante = "solida", demonstracao = false }: PropsHeader) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [rolado, setRolado] = useState(false);
  const [escondido, setEscondido] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const hamburguerRef = useRef<HTMLButtonElement>(null);
  const idMenu = useId();
  const sufixo = demonstracao ? ", exemplo" : "";

  useEffect(() => {
    if (demonstracao) return;
    let ultimaPosicao = window.scrollY;
    let quadro = 0;

    function atualizar() {
      quadro = 0;
      const posicao = window.scrollY;
      const header = headerRef.current;
      setRolado(posicao > LIMITE_DE_ROLAGEM_PX);
      if (posicao <= LIMITE_DE_ROLAGEM_PX) {
        setEscondido(false);
        ultimaPosicao = posicao;
        return;
      }
      const diferenca = posicao - ultimaPosicao;
      if (Math.abs(diferenca) < TOLERANCIA_DE_ROLAGEM_PX) return;
      // Foco visível (teclado) conta como uso; o foco que fica num link
      // depois de um clique do mouse não, para o header continuar recolhendo.
      const emUso = !!header?.querySelector(':focus-visible, [aria-expanded="true"]');
      setEscondido(diferenca > 0 && !emUso);
      ultimaPosicao = posicao;
    }

    // Um cálculo por quadro, no máximo; o ouvinte é passivo.
    function aoRolar() {
      if (!quadro) quadro = requestAnimationFrame(atualizar);
    }

    // Foco de teclado que entra no header escondido (Tab) traz o header de volta.
    function aoFocar() {
      if (headerRef.current?.querySelector(":focus-visible")) setEscondido(false);
    }

    atualizar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    const header = headerRef.current;
    header?.addEventListener("focusin", aoFocar);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("scroll", aoRolar);
      header?.removeEventListener("focusin", aoFocar);
    };
  }, [demonstracao]);

  // Altura que o header ocupa no alto da janela (0 quando escondido), em
  // --altura-do-header-visivel no <html>: a barra de filtros da loja fica
  // logo abaixo dele e acompanha quando ele se esconde (29/10/2026).
  const ocupaOAlto = !escondido || menuAberto;
  useEffect(() => {
    const header = headerRef.current;
    if (demonstracao || !header) return;
    const raiz = document.documentElement;
    const publicar = () => raiz.style.setProperty("--altura-do-header-visivel", ocupaOAlto ? `${header.offsetHeight}px` : "0px");
    publicar();
    const observador = new ResizeObserver(publicar);
    observador.observe(header);
    return () => observador.disconnect();
  }, [ocupaOAlto, demonstracao]);

  const fecharMenu = useCallback((devolverFoco = true) => {
    setMenuAberto(false);
    // O foco volta para o botão que abriu o menu.
    if (devolverFoco) requestAnimationFrame(() => hamburguerRef.current?.focus());
  }, []);

  const classes = [
    estilos.header,
    variante === "transparente" ? estilos.transparente : estilos.solida,
    rolado && !escondido ? estilos.comFundo : "",
    escondido && !menuAberto ? estilos.escondido : "",
    demonstracao ? estilos.demonstracao : "",
  ].join(" ");

  return (
    <header ref={headerRef} className={classes}>
      <div className={`container ${estilos.barra}`}>
        <Logo />
        <div className={estilos.colunaDireita}>
          <div className={`${estilos.menuFundoBranco} ${estilos.somenteDesktop}`}>
            <MenuDesktop itens={MENU_PRINCIPAL} rotulo={`Menu principal${sufixo}`} />
          </div>
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
