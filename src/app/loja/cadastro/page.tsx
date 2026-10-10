import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { destinoSeguroNaLoja } from "@/lib/auth/destino";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";
import { FormularioCadastroLoja } from "../_componentes/FormularioCadastroLoja/FormularioCadastroLoja";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Criar conta na loja", robots: { index: false, follow: false } };

export default async function PaginaCadastroLoja({ searchParams }: { searchParams: Promise<{ voltar?: string }> }) {
  const destino = destinoSeguroNaLoja((await searchParams).voltar);
  if (await lerSessaoCliente()) redirect(destino);

  return (
    <div className={`container ${estilos.secao}`}>
      <h1 className={`tipo-h2 ${estilos.titulo}`}>Criar conta na loja</h1>
      <p className="tipo-texto">A conta serve para guardar seu carrinho. A compra online ainda não está disponível.</p>
      <div className={estilos.conteudo}>
        <FormularioCadastroLoja destino={destino} />
      </div>
    </div>
  );
}
