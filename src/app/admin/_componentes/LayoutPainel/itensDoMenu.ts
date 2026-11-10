import type { ReactNode } from "react";

// Item do menu do painel (10/11/2026: separado do LayoutPainel para o
// GrupoDoMenu usar sem importação circular).
export type ItemDoPainel = {
  href: string;
  rotulo: string;
  icone?: (props: { className?: string }) => ReactNode;
  exato?: boolean;
  // Caminhos que começam igual, mas são de outro item (ex.: categorias).
  fora?: string[];
  soAdministrador?: boolean;
  // Subitens do grupo (o primeiro costuma ser a própria página do grupo).
  sub?: ItemDoPainel[];
};

export function itemAtual(caminho: string, item: ItemDoPainel): boolean {
  if (item.exato) return caminho === item.href;
  if (item.fora?.some((outro) => caminho.startsWith(outro))) return false;
  return caminho === item.href || caminho.startsWith(`${item.href}/`);
}
