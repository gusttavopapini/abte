import type { ReactNode } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { lerCarrinhoAtual } from "@/lib/dados/carrinho";
import { ProvedorDaLoja } from "./_componentes/LinksDaLoja/LinksDaLoja";

// Os atalhos de carrinho e conta são compartilhados pelas páginas da loja.
export default async function LayoutLoja({ children }: { children: ReactNode }) {
  // Carrinho da conta ou, sem sessão, do cookie de visitante (08/11/2026).
  const { cliente, itens } = await lerCarrinhoAtual();
  // Unidades guardadas no carrinho (contagem simples, sem conferir os produtos).
  const unidades = itens.reduce((soma, item) => soma + item.quantidade, 0);
  return (
    <LayoutPublico header="solida">
      {/* Links da loja no topo de cada página (08/11/2026), no lugar do botão
          flutuante "+", que cobria a caixa de compra e textos. */}
      <ProvedorDaLoja logado={cliente !== null} unidades={unidades}>
        {children}
      </ProvedorDaLoja>
    </LayoutPublico>
  );
}
