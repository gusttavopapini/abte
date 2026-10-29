"use client";

import { type ReactNode, useId } from "react";
import { IconeSeta } from "@/components/Icones/Icones";
import estilos from "./GrupoDoFiltro.module.css";

// Grupo recolhível do filtro da loja: cartão branco com o título como botão
// (aria-expanded, seta que gira) e o conteúdo que abre e fecha com a altura
// animada. Sem JavaScript (interativo false), o botão fica desligado e o
// grupo, aberto.
export function GrupoDoFiltro({
  titulo,
  aberto,
  interativo,
  aoAlternar,
  children,
}: {
  titulo: string;
  aberto: boolean;
  interativo: boolean;
  aoAlternar: () => void;
  children: ReactNode;
}) {
  const idBotao = useId();
  const idConteudo = useId();
  const visivel = aberto || !interativo;
  return (
    <div className={estilos.grupo}>
      <h3 className={estilos.titulo}>
        <button
          type="button"
          id={idBotao}
          className={estilos.alternar}
          aria-expanded={visivel}
          aria-controls={idConteudo}
          disabled={!interativo}
          onClick={aoAlternar}
        >
          {titulo}
          <IconeSeta className={estilos.seta} />
        </button>
      </h3>
      <div id={idConteudo} role="group" aria-labelledby={idBotao} className={`${estilos.conteudo} ${visivel ? estilos.aberto : ""}`}>
        <div className={estilos.interno}>
          <div className={estilos.miolo}>{children}</div>
        </div>
      </div>
    </div>
  );
}
