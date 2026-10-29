"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, type CSSProperties, type FocusEvent, type ReactNode, useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { IconeFechar, IconeGrade, IconePessoa, IconePontos, IconeSacola } from "@/components/Icones/Icones";
import { opcoesDoMenuDaLoja, type OpcaoDoMenuDaLoja } from "@/lib/loja/menu";
import estilos from "./MenuDaLoja.module.css";

// Até 1023px, na /loja, o botão de filtros oferece uma "doca" logo acima dele
// (FiltroDaLoja): o menu vai para lá, para os dois nunca se sobreporem.
const MIDIA_DA_DOCA = "(max-width: 1023px)";
// Desktop: abre 80ms depois de o mouse entrar e fecha 250ms depois de sair,
// para não fechar ao passar de uma opção para outra.
const ATRASO_PARA_ABRIR_MS = 80;
const TOLERANCIA_PARA_FECHAR_MS = 250;

const ContextoDaDoca = createContext<(doca: HTMLElement | null) => void>(() => {});

// Para o FiltroDaLoja registrar a doca (ref de um elemento vazio).
export function useRegistrarDocaDoMenuDaLoja() {
  return useContext(ContextoDaDoca);
}

function useMidiaDaDoca(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const midia = window.matchMedia(MIDIA_DA_DOCA);
      midia.addEventListener("change", avisar);
      return () => midia.removeEventListener("change", avisar);
    },
    () => window.matchMedia(MIDIA_DA_DOCA).matches,
    () => false,
  );
}

const ICONES: Record<OpcaoDoMenuDaLoja["chave"], (props: { className?: string }) => ReactNode> = {
  produtos: IconeGrade,
  carrinho: IconeSacola,
  entrar: IconePessoa,
  conta: IconePessoa,
};

// Menu flutuante da loja (29/10/2026), só nas páginas da loja (montado no
// layout da loja), no lugar do antigo subcabeçalho: Produtos, Carrinho e
// Entrar ou Minha conta. Fora da doca, fica preso ao pé da tela enquanto a
// página passa e para antes do rodapé (âncora no fim do <main>).
export function MenuDaLoja({ logado, unidades, children }: { logado: boolean; unidades: number; children: ReactNode }) {
  const [doca, setDoca] = useState<HTMLElement | null>(null);
  const naDoca = useMidiaDaDoca() && doca !== null;
  const menu = <BotaoDoMenu logado={logado} unidades={unidades} />;
  return (
    <ContextoDaDoca.Provider value={setDoca}>
      {children}
      {naDoca ? createPortal(menu, doca) : <div className={estilos.lugar}>{menu}</div>}
    </ContextoDaDoca.Provider>
  );
}

function BotaoDoMenu({ logado, unidades }: { logado: boolean; unidades: number }) {
  const caminho = usePathname();
  const opcoes = opcoesDoMenuDaLoja(caminho, { logado, unidades });
  const [aberto, setAberto] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const temporizador = useRef(0);
  // O foco devolvido ao botão pelo Esc não reabre o menu.
  const ignorarFoco = useRef(false);
  // Depois de escolher uma opção (ou do Esc), o mouse só reabre o menu
  // depois de sair dele: a página nova que aparece sob o cursor conta como
  // uma "entrada" e reabriria o menu sozinho.
  const hoverBloqueado = useRef(false);
  const idLista = useId();

  // Ao trocar de página, o menu fecha.
  const [caminhoVisto, setCaminhoVisto] = useState(caminho);
  if (caminhoVisto !== caminho) {
    setCaminhoVisto(caminho);
    setAberto(false);
  }

  function agendar(abrir: boolean, ms: number) {
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setAberto(abrir), ms);
  }
  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  // Aberto: Esc fecha e devolve o foco ao botão; toque ou clique fora fecha.
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      setAberto(false);
      hoverBloqueado.current = true;
      ignorarFoco.current = true;
      botaoRef.current?.focus();
      ignorarFoco.current = false;
    };
    const aoTocar = (evento: PointerEvent) => {
      if (!raizRef.current?.contains(evento.target as Node)) setAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("pointerdown", aoTocar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("pointerdown", aoTocar);
    };
  }, [aberto]);

  // Foco de teclado dentro do menu abre; o foco que sai dele fecha. O foco
  // que fica no botão depois de um toque não abre (o toque usa o clique).
  function aoFocar(evento: FocusEvent<HTMLDivElement>) {
    if (ignorarFoco.current || !evento.target.matches(":focus-visible")) return;
    window.clearTimeout(temporizador.current);
    setAberto(true);
  }
  function aoDesfocar(evento: FocusEvent<HTMLDivElement>) {
    if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setAberto(false);
  }

  return (
    <div
      ref={raizRef}
      className={`${estilos.menu} ${aberto ? estilos.aberto : ""}`}
      style={{ "--total": opcoes.length } as CSSProperties}
      onPointerEnter={(evento) => evento.pointerType === "mouse" && !hoverBloqueado.current && agendar(true, ATRASO_PARA_ABRIR_MS)}
      onPointerLeave={(evento) => {
        if (evento.pointerType !== "mouse") return;
        hoverBloqueado.current = false;
        agendar(false, TOLERANCIA_PARA_FECHAR_MS);
      }}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
    >
      <button
        ref={botaoRef}
        type="button"
        className={estilos.principal}
        aria-label="Menu da loja"
        aria-expanded={aberto}
        aria-controls={idLista}
        onClick={() => {
          window.clearTimeout(temporizador.current);
          setAberto((atual) => !atual);
        }}
      >
        <IconePontos className={`${estilos.icone} ${estilos.iconePontos}`} />
        <IconeFechar className={`${estilos.icone} ${estilos.iconeFechar}`} />
        {unidades > 0 && (
          <span className={estilos.quantidade} aria-hidden="true">
            {unidades}
          </span>
        )}
      </button>

      {/* Corrente de pontinhos entre o botão e as opções, como a do logo. */}
      <span className={estilos.corrente} aria-hidden="true">
        {[0, 1, 2, 3, 4].map((ponto) => (
          <span key={ponto} className={estilos.ponto} style={{ "--ponto": ponto } as CSSProperties} />
        ))}
      </span>

      {/* De baixo para cima na tela, na ordem do teclado. Fechado, o
          visibility: hidden tira as opções do foco e dos leitores de tela. */}
      <ul id={idLista} role="list" className={estilos.opcoes}>
        {opcoes.map((opcao, ordem) => {
          const Icone = ICONES[opcao.chave];
          return (
            <li key={opcao.chave} className={estilos.item} style={{ "--ordem": ordem } as CSSProperties}>
              <Link href={opcao.href} className={estilos.opcao} aria-current={opcao.atual ? "page" : undefined} onClick={() => {
                  window.clearTimeout(temporizador.current);
                  hoverBloqueado.current = true;
                  setAberto(false);
                }}>
                <span className={estilos.rotulo}>{opcao.rotulo}</span>
                <span className={estilos.circulo}>
                  <Icone className={estilos.iconeDaOpcao} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
