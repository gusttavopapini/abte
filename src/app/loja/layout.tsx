import type { ReactNode } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";
import { lerItensDoCarrinho } from "@/lib/dados/carrinho";
import { MenuDaLoja } from "./_componentes/MenuDaLoja/MenuDaLoja";

// Layout de toda a área da loja: o layout público do site com o menu
// flutuante da loja (29/10/2026, no lugar da faixa de Produtos, Carrinho e
// Entrar). Login e conta só aparecem aqui; o cabeçalho do site não tem
// login nem carrinho (decisão D1).
export default async function LayoutLoja({ children }: { children: ReactNode }) {
  const cliente = await lerSessaoCliente();
  // Unidades guardadas no carrinho (contagem simples, sem conferir os produtos).
  const unidades = cliente ? (await lerItensDoCarrinho(cliente.uid)).reduce((soma, item) => soma + item.quantidade, 0) : 0;
  return (
    <LayoutPublico header="solida">
      <MenuDaLoja logado={cliente !== null} unidades={unidades}>
        {children}
      </MenuDaLoja>
    </LayoutPublico>
  );
}
