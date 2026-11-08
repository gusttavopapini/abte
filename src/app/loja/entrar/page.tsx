import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { destinoSeguroNaLoja } from "@/lib/auth/destino";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";
import { CaixaDeAcesso } from "../_componentes/CaixaDeAcesso/CaixaDeAcesso";
import { FormularioEntrarLoja } from "../_componentes/FormularioEntrarLoja/FormularioEntrarLoja";

export const metadata: Metadata = { title: "Entrar na loja", robots: { index: false, follow: false } };

export default async function PaginaEntrarLoja({ searchParams }: { searchParams: Promise<{ voltar?: string; criada?: string }> }) {
  const { voltar, criada } = await searchParams;
  const destino = destinoSeguroNaLoja(voltar);
  // Quem já entrou vai direto para o destino.
  if (await lerSessaoCliente()) redirect(destino);

  return (
    <CaixaDeAcesso titulo="Entrar na loja" descricao="Use seu e-mail e sua senha para acessar sua conta da loja.">
      {criada === "1" && <Mensagem tipo="sucesso">Conta criada. Entre com seu e-mail e sua senha.</Mensagem>}
      <FormularioEntrarLoja destino={destino} />
    </CaixaDeAcesso>
  );
}
