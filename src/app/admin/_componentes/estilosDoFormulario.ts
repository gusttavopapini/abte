import type { CSSProperties } from "react";

// Estilos comuns aos formulários de post e de artigo do painel, com os mesmos
// valores que cada formulário tinha antes. Atenção: --space-12 e
// --font-size-base não existem no tokens.css; o navegador ignora essas duas
// declarações (pendência registrada no CLAUDE.md).
export const estiloFormulario: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-24)", maxWidth: "800px" };

export const estiloGrupo: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-8)" };

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

export const estiloBotoes: CSSProperties = { display: "flex", gap: "var(--space-16)", marginTop: "var(--space-16)" };
