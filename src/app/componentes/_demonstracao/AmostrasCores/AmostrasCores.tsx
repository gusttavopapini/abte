"use client";

import { useSyncExternalStore } from "react";
import estilos from "./AmostrasCores.module.css";

// Nomes dos tokens de cor do tokens.css. O HEX é lido do próprio CSS, para
// nunca ficar diferente do arquivo de tokens.
const TOKENS = [
  "--color-primary",
  "--color-primary-hover",
  "--color-text",
  "--color-on-primary",
  "--color-bg",
  "--color-bg-alt",
  "--color-surface-strong",
  "--color-surface-soft",
  "--color-footer-bg",
  "--color-contact-bg",
  "--color-number",
  "--color-placeholder",
  "--color-error",
  "--color-success",
  "--color-feedback-bg",
  "--color-neutral",
  "--color-icon-social",
];

const semAssinatura = () => () => {};

function lerHex(token: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim().toUpperCase();
}

function Amostra({ token }: { token: string }) {
  const hex = useSyncExternalStore(semAssinatura, () => lerHex(token), () => "");
  return (
    <li className={estilos.item}>
      <span className={estilos.cor} style={{ background: `var(${token})` }} />
      <code className={estilos.nome}>{token}</code>
      <span className={estilos.hex}>{hex}</span>
    </li>
  );
}

export function AmostrasCores() {
  return (
    <ul role="list" className={estilos.grade}>
      {TOKENS.map((token) => (
        <Amostra key={token} token={token} />
      ))}
    </ul>
  );
}
