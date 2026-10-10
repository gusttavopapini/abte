import type { ReactNode } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { SubcabecalhoLoja, type LinkDaLoja } from "@/components/SubcabecalhoLoja/SubcabecalhoLoja";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";

// Layout de toda a área da loja: o layout público do site com o subcabeçalho
// próprio da loja logo abaixo do cabeçalho. Login e conta só aparecem aqui.
export default async function LayoutLoja({ children }: { children: ReactNode }) {
  const cliente = await lerSessaoCliente();
  const links: LinkDaLoja[] = [
    { rotulo: "Produtos", href: "/loja", ativoEm: ["/loja/produto"] },
    cliente
      ? { rotulo: "Minha conta", href: "/loja/conta" }
      : { rotulo: "Entrar", href: "/loja/entrar", ativoEm: ["/loja/entrar", "/loja/cadastro"] },
  ];
  return (
    <LayoutPublico header="solida">
      <SubcabecalhoLoja links={links} />
      {children}
    </LayoutPublico>
  );
}
