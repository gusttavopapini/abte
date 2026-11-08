import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { destinoSeguroNaLoja } from "@/lib/auth/destino";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";
import { lerPaginasEmCache } from "@/lib/dados/paginas";
import { paginaNoSite } from "@/lib/site/paginas";
import { FormularioCadastroLoja } from "../_componentes/FormularioCadastroLoja/FormularioCadastroLoja";
import { LinksDaLoja } from "../_componentes/LinksDaLoja/LinksDaLoja";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Criar conta na loja", robots: { index: false, follow: false } };

export default async function PaginaCadastroLoja({ searchParams }: { searchParams: Promise<{ voltar?: string }> }) {
  const destino = destinoSeguroNaLoja((await searchParams).voltar);
  if (await lerSessaoCliente()) redirect(destino);
  const politicaPublicada = paginaNoSite((await lerPaginasEmCache()).get("politica-de-privacidade"));

  return (
    <div className={`container pagina-interna ${estilos.secao}`}>
      {/* Links da loja (08/11/2026), no lugar do menu flutuante. */}
      <LinksDaLoja />
      <h1 className={`tipo-h2 ${estilos.titulo}`}>Criar conta na loja</h1>
      <p className="tipo-texto">A conta serve para guardar seu carrinho. A compra online ainda não está disponível.</p>
      <div className={estilos.conteudo}>
        <FormularioCadastroLoja destino={destino} politicaPublicada={politicaPublicada} />
      </div>
    </div>
  );
}
