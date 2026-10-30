"use client";

import estilos from "./Interruptor.module.css";

// Interruptor acessível (role="switch"), com o estado escrito ao lado.
// (30/10/2026; usado em /admin/configuracoes e /admin/paginas.)
export function Interruptor({ id, rotulo, ligado, aoMudar, descricao }: { id: string; rotulo: string; ligado: boolean; aoMudar: (ligado: boolean) => void; descricao?: string }) {
  return (
    <div className={estilos.linhaDoInterruptor}>
      <span id={`${id}-rotulo`} className={estilos.rotulo}>
        {rotulo}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-labelledby={`${id}-rotulo`}
        aria-describedby={descricao}
        onClick={() => aoMudar(!ligado)}
        className={estilos.interruptor}
      >
        <span className={estilos.trilho} aria-hidden="true">
          <span className={estilos.botaoDoTrilho} />
        </span>
        <span className={estilos.estado}>{ligado ? "Ativo" : "Inativo"}</span>
      </button>
    </div>
  );
}
