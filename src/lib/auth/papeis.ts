// Papéis do painel, gravados como custom claim "papel" no Firebase Authentication.
// Este arquivo não tem segredos e pode ser usado no servidor e em scripts.
export const PAPEIS_DO_PAINEL = ["administrador", "editor"] as const;

export type PapelDoPainel = (typeof PAPEIS_DO_PAINEL)[number];

export function ehPapelDoPainel(valor: unknown): valor is PapelDoPainel {
  return typeof valor === "string" && (PAPEIS_DO_PAINEL as readonly string[]).includes(valor);
}
