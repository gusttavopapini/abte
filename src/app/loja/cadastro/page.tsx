import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { destinoSeguroNaLoja } from "@/lib/auth/destino";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";
import { lerPaginasEmCache } from "@/lib/dados/paginas";
import { paginaNoSite } from "@/lib/site/paginas";
import { CaixaDeAcesso } from "../_componentes/CaixaDeAcesso/CaixaDeAcesso";
import { FormularioCadastroLoja } from "../_componentes/FormularioCadastroLoja/FormularioCadastroLoja";

export const metadata: Metadata = { title: "Criar conta na loja", robots: { index: false, follow: false } };

export default async function PaginaCadastroLoja({ searchParams }: { searchParams: Promise<{ voltar?: string }> }) {
  const destino = destinoSeguroNaLoja((await searchParams).voltar);
  if (await lerSessaoCliente()) redirect(destino);
  const politicaPublicada = paginaNoSite((await lerPaginasEmCache()).get("politica-de-privacidade"));

  return (
    <CaixaDeAcesso titulo="Criar conta na loja" descricao="A conta serve para guardar seu carrinho. A compra online ainda não está disponível.">
      <FormularioCadastroLoja destino={destino} politicaPublicada={politicaPublicada} />
    </CaixaDeAcesso>
  );
}
