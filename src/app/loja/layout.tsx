import type { ReactNode } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { lerCarrinhoAtual } from "@/lib/dados/carrinho";
import { MenuDaLoja } from "./_componentes/MenuDaLoja/MenuDaLoja";

// Os atalhos de carrinho e conta são compartilhados pelas páginas da loja.
export default async function LayoutLoja({ children }: { children: ReactNode }) {
  // Carrinho da conta ou, sem sessão, do cookie de visitante (08/11/2026).
  const { cliente, itens } = await lerCarrinhoAtual();
  // Unidades guardadas no carrinho (contagem simples, sem conferir os produtos).
  const unidades = itens.reduce((soma, item) => soma + item.quantidade, 0);
  return (
    <LayoutPublico header="solida">
      <MenuDaLoja logado={cliente !== null} unidades={unidades} />
      {children}
    </LayoutPublico>
  );
}
