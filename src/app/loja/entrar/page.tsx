import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { destinoSeguroNaLoja } from "@/lib/auth/destino";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";
import { FormularioEntrarLoja } from "../_componentes/FormularioEntrarLoja/FormularioEntrarLoja";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Entrar na loja", robots: { index: false, follow: false } };

export default async function PaginaEntrarLoja({ searchParams }: { searchParams: Promise<{ voltar?: string; criada?: string }> }) {
  const { voltar, criada } = await searchParams;
  const destino = destinoSeguroNaLoja(voltar);
  // Quem já entrou vai direto para o destino.
  if (await lerSessaoCliente()) redirect(destino);

  return (
    <div className={`container ${estilos.secao}`}>
      <h1 className={`tipo-h2 ${estilos.titulo}`}>Entrar na loja</h1>
      <p className="tipo-texto">Use a conta de cliente da loja. A conta do painel não serve aqui.</p>
      <div className={estilos.conteudo}>
        <div>
          {criada === "1" && <Mensagem tipo="sucesso">Conta criada. Entre com seu e-mail e sua senha.</Mensagem>}
          <FormularioEntrarLoja destino={destino} />
        </div>
      </div>
    </div>
  );
}
