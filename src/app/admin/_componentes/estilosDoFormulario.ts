import type { CSSProperties } from "react";

// Estilos inline comuns aos formulários de post e de artigo do painel, com os
// mesmos valores de antes. Ficam inline porque têm valores sem token
// (exceções no CLAUDE.md); os que só usam tokens estão em
// estilosDoFormulario.module.css.
// Atenção: --space-12 e --font-size-base não existem no tokens.css; o
// navegador ignora essas duas declarações (pendência no CLAUDE.md).
export const estiloFormulario: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-24)", maxWidth: "800px" };

export const estiloRotulo: CSSProperties = { fontWeight: 500 };

export const estiloEntrada: CSSProperties = {
  padding: "var(--space-12)",
  borderRadius: "5px",
  border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)",
  background: "transparent",
  color: "var(--color-text)",
  width: "100%",
  fontSize: "var(--font-size-base)",
};

export const estiloAreaDeTexto: CSSProperties = { ...estiloEntrada, resize: "vertical" };

export const estiloSelecao: CSSProperties = { ...estiloEntrada, background: "var(--color-bg)" };
