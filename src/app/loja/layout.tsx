import type { ReactNode } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { SubcabecalhoLoja, type LinkDaLoja } from "@/components/SubcabecalhoLoja/SubcabecalhoLoja";

// Layout de toda a área da loja: o layout público do site com o subcabeçalho
// próprio da loja logo abaixo do cabeçalho.
export default function LayoutLoja({ children }: { children: ReactNode }) {
  const links: LinkDaLoja[] = [{ rotulo: "Produtos", href: "/loja", ativoEm: ["/loja/produto"] }];
  return (
    <LayoutPublico header="solida">
      <SubcabecalhoLoja links={links} />
      {children}
    </LayoutPublico>
  );
}
