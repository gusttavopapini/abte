"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { IconeSeta } from "@/components/Icones/Icones";
import { itemAtual, type ItemDoPainel } from "./itensDoMenu";
import estilos from "./LayoutPainel.module.css";

type Props = {
  item: ItemDoPainel;
  sub: ItemDoPainel[];
  caminho: string;
  // "lateral": barra a partir de 1024px (painel flutuante); "gaveta": até 1023px (acordeão).
  modo: "lateral" | "gaveta";
  idBase: string;
};

// Tempo de tolerância para fechar o painel flutuante quando o ponteiro sai
// (dá para atravessar a margem da barra até o painel sem ele sumir).
const TOLERANCIA_PARA_FECHAR_MS = 200;

// Grupo recolhível do menu do painel (10/11/2026), no estilo do WordPress.
// - O rótulo leva à página principal do grupo; a seta ao lado (botão com
//   aria-expanded e aria-controls) abre e fecha os subitens.
// - Subitens escondidos por padrão; o grupo da seção atual começa aberto, com
//   o item atual destacado.
// - Na barra lateral (a partir de 1024px), um grupo fechado mostra os
//   subitens num painel flutuante ao lado da barra quando o mouse passa por
//   ele ou o foco do teclado chega ao rótulo, sem empurrar o menu. Esc fecha
//   o painel e devolve o foco à seta.
// - A seta (Enter, Espaço ou clique) abre e fecha os subitens no lugar, como
//   um acordeão; é o único comportamento na gaveta (até 1023px).
export function GrupoDoMenu({ item, sub, caminho, modo, idBase }: Props) {
  const daSecao = sub.some((subitem) => itemAtual(caminho, subitem)) || itemAtual(caminho, item);
  // No lugar: aberto por padrão só na seção atual (o componente é refeito a
  // cada troca de página, pela chave).
  const [noLugar, setNoLugar] = useState(daSecao);
  const [flutuante, setFlutuante] = useState(false);
  // Esc fecha o painel flutuante e ele não reabre enquanto o foco continuar no grupo.
  const fechadoPeloEsc = useRef(false);
  const [topo, setTopo] = useState(0);
  const grupoRef = useRef<HTMLLIElement>(null);
  const setaRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idDaLista = `${idBase}-${item.href.replace(/\W+/g, "-")}`;
  const podeFlutuar = modo === "lateral" && !noLugar;
  const aberto = noLugar || (podeFlutuar && flutuante);

  function cancelarFechamento() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function abrirFlutuante() {
    if (!podeFlutuar || fechadoPeloEsc.current) return;
    cancelarFechamento();
    // O painel fica preso à janela (position: fixed), na altura da linha do grupo.
    const linha = grupoRef.current?.getBoundingClientRect();
    // Perto do pé da janela, sobe o bastante para caber (44px por subitem e as margens).
    if (linha) setTopo(Math.max(0, Math.min(linha.top, window.innerHeight - (sub.length * 48 + 24))));
    setFlutuante(true);
  }

  function fecharFlutuanteDepois() {
    cancelarFechamento();
    timer.current = setTimeout(() => setFlutuante(false), TOLERANCIA_PARA_FECHAR_MS);
  }

  useEffect(() => cancelarFechamento, []);

  // O painel flutuante fecha se a barra rolar (deixaria de ficar ao lado da linha).
  useEffect(() => {
    if (!flutuante) return;
    const menu = grupoRef.current?.closest("nav");
    const fechar = () => setFlutuante(false);
    menu?.addEventListener("scroll", fechar, { passive: true });
    window.addEventListener("resize", fechar);
    return () => {
      menu?.removeEventListener("scroll", fechar);
      window.removeEventListener("resize", fechar);
    };
  }, [flutuante]);

  function alternar() {
    cancelarFechamento();
    setFlutuante(false);
    setNoLugar((atual) => !atual);
  }

  function aoTeclar(evento: KeyboardEvent<HTMLLIElement>) {
    if (evento.key !== "Escape" || !flutuante) return;
    evento.preventDefault();
    evento.stopPropagation();
    cancelarFechamento();
    setFlutuante(false);
    fechadoPeloEsc.current = true;
    setaRef.current?.focus();
  }

  const Icone = item.icone;
  return (
    <li
      ref={grupoRef}
      className={`${estilos.grupoDoMenu} ${aberto ? estilos.grupoAberto : ""}`}
      onMouseEnter={modo === "lateral" ? abrirFlutuante : undefined}
      onMouseLeave={
        modo === "lateral"
          ? () => {
              if (!grupoRef.current?.contains(document.activeElement)) fechadoPeloEsc.current = false;
              fecharFlutuanteDepois();
            }
          : undefined
      }
      onBlur={
        modo === "lateral"
          ? (evento) => {
              if (grupoRef.current?.contains(evento.relatedTarget as Node | null)) return;
              fechadoPeloEsc.current = false;
              cancelarFechamento();
              setFlutuante(false);
            }
          : undefined
      }
      onKeyDown={aoTeclar}
    >
      <div className={estilos.linhaDoGrupo}>
        <Link
          href={item.href}
          className={`${estilos.linkMenu} ${estilos.linkDoGrupo} ${daSecao ? estilos.secaoAtual : ""}`}
          onFocus={modo === "lateral" ? abrirFlutuante : undefined}
        >
          {Icone && <Icone className={estilos.iconeDoMenu} />}
          {item.rotulo}
        </Link>
        <button
          ref={setaRef}
          type="button"
          className={estilos.setaDoGrupo}
          aria-expanded={aberto}
          aria-controls={idDaLista}
          aria-label={`Itens de ${item.rotulo}`}
          onClick={alternar}
        >
          <IconeSeta className={estilos.iconeDaSeta} />
        </button>
      </div>
      <ul
        id={idDaLista}
        role="list"
        aria-label={item.rotulo}
        className={`${estilos.subitens} ${noLugar ? estilos.subitensNoLugar : podeFlutuar && flutuante ? estilos.subitensFlutuantes : ""}`}
        hidden={!aberto}
        style={podeFlutuar && flutuante ? { top: topo } : undefined}
        onMouseEnter={cancelarFechamento}
      >
        {sub.map((subitem) => {
          const atual = itemAtual(caminho, subitem);
          return (
            <li key={subitem.href}>
              <Link href={subitem.href} className={`${estilos.linkMenu} ${estilos.subitem} ${atual ? estilos.atual : ""}`} aria-current={atual ? "page" : undefined}>
                {subitem.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </li>
  );
}
