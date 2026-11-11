"use client";

import Link from "next/link";
import { useState } from "react";
import { IconeSeta } from "@/components/Icones/Icones";
import { itemAtual, type ItemDoPainel } from "./itensDoMenu";
import estilos from "./LayoutPainel.module.css";

type Props = {
  item: ItemDoPainel;
  sub: ItemDoPainel[];
  caminho: string;
  idBase: string;
};

// Grupo recolhível do menu do painel (10/11/2026; acordeão em todas as
// larguras desde o mesmo dia, sem painel flutuante).
// - A linha inteira (ícone, rótulo e seta) é um botão com aria-expanded e
//   aria-controls: clique, Enter ou Espaço abrem e fecham os subitens no
//   lugar. Passar o mouse não abre nada.
// - Subitens escondidos por padrão; o grupo da seção atual começa aberto, com
//   o item atual destacado. A página principal do grupo fica no primeiro
//   subitem (ex.: Produtos > Produtos).
export function GrupoDoMenu({ item, sub, caminho, idBase }: Props) {
  const daSecao = sub.some((subitem) => itemAtual(caminho, subitem)) || itemAtual(caminho, item);
  // Aberto por padrão só na seção atual (o componente é refeito a cada troca
  // de página, pela chave).
  const [aberto, setAberto] = useState(daSecao);
  const idDaLista = `${idBase}-${item.href.replace(/\W+/g, "-")}`;

  const Icone = item.icone;
  return (
    <li className={`${estilos.grupoDoMenu} ${aberto ? estilos.grupoAberto : ""}`}>
      <button
        type="button"
        className={`${estilos.linkMenu} ${estilos.botaoDoGrupo} ${daSecao ? estilos.secaoAtual : ""}`}
        aria-expanded={aberto}
        aria-controls={idDaLista}
        onClick={() => setAberto((atual) => !atual)}
      >
        {Icone && <Icone className={estilos.iconeDoMenu} />}
        <span className={estilos.rotuloDoGrupo}>{item.rotulo}</span>
        <IconeSeta className={estilos.iconeDaSeta} />
      </button>
      <ul id={idDaLista} role="list" aria-label={item.rotulo} className={estilos.subitens} hidden={!aberto}>
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
