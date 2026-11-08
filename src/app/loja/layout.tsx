import type { ReactNode } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";
import { lerItensDoCarrinho } from "@/lib/dados/carrinho";
import { ProvedorDaLoja } from "./_componentes/LinksDaLoja/LinksDaLoja";

// Layout de toda a área da loja: o layout público do site e os dados dos
// links da loja (carrinho e conta), que cada página mostra no seu topo
// (08/11/2026, no lugar do menu flutuante de 29/10/2026). Login e conta só
// aparecem aqui; o cabeçalho do site não tem login nem carrinho (decisão D1).
export default async function LayoutLoja({ children }: { children: ReactNode }) {
  const cliente = await lerSessaoCliente();
  // Unidades guardadas no carrinho (contagem simples, sem conferir os produtos).
  const unidades = cliente ? (await lerItensDoCarrinho(cliente.uid)).reduce((soma, item) => soma + item.quantidade, 0) : 0;
  return (
    <LayoutPublico header="solida">
      <ProvedorDaLoja logado={cliente !== null} unidades={unidades}>
        {children}
      </ProvedorDaLoja>
    </LayoutPublico>
  );
}
