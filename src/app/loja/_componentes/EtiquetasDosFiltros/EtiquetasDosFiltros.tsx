"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { IconeFechar } from "@/components/Icones/Icones";
import estilos from "./EtiquetasDosFiltros.module.css";

export type EtiquetaDoFiltro = { chave: string; rotulo: string; endereco: string };

// Filtros ativos acima da grade da loja, cada um com o x para tirar, e
// "Limpar filtros". São links para a loja sem aquele filtro (funcionam sem
// JavaScript); com JavaScript, aoNavegar troca a lista sem recarregar.
export function EtiquetasDosFiltros({
  etiquetas,
  enderecoSemFiltros,
  aoNavegar,
}: {
  etiquetas: EtiquetaDoFiltro[];
  enderecoSemFiltros: string;
  aoNavegar: (evento: MouseEvent<HTMLAnchorElement>, endereco: string) => void;
}) {
  return (
    <ul role="list" aria-label="Filtros ativos" className={estilos.lista}>
      {etiquetas.map((etiqueta) => (
        <li key={etiqueta.chave}>
          <Link
            href={etiqueta.endereco}
            replace
            scroll={false}
            aria-label={`Remover filtro: ${etiqueta.rotulo}`}
            className={estilos.etiqueta}
            onClick={(evento) => aoNavegar(evento, etiqueta.endereco)}
          >
            {etiqueta.rotulo}
            <IconeFechar className={estilos.icone} />
          </Link>
        </li>
      ))}
      <li>
        <Link href={enderecoSemFiltros} replace scroll={false} className={estilos.limpar} onClick={(evento) => aoNavegar(evento, enderecoSemFiltros)}>
          Limpar filtros
        </Link>
      </li>
    </ul>
  );
}
