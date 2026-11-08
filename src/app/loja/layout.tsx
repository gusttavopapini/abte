import type { ReactNode } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";
import { lerItensDoCarrinho } from "@/lib/dados/carrinho";
import { MenuDaLoja } from "./_componentes/MenuDaLoja/MenuDaLoja";

// Os atalhos de carrinho e conta são compartilhados pelas páginas da loja.
export default async function LayoutLoja({ children }: { children: ReactNode }) {
  const cliente = await lerSessaoCliente();
  // Unidades guardadas no carrinho (contagem simples, sem conferir os produtos).
  const unidades = cliente ? (await lerItensDoCarrinho(cliente.uid)).reduce((soma, item) => soma + item.quantidade, 0) : 0;
  return (
    <LayoutPublico header="solida">
      <MenuDaLoja logado={cliente !== null} unidades={unidades} />
      {children}
    </LayoutPublico>
  );
}
