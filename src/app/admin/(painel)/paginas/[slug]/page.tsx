import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { papelPodeExecutar } from "@/lib/auth/papeis";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerPaginasAgora } from "@/lib/dados/paginas";
import { ehSlugDePagina } from "@/lib/site/paginas";
import { FormularioDaPagina } from "./FormularioDaPagina";

export const metadata: Metadata = { title: "Editar página" };

// Edição de uma página institucional (30/10/2026), só administrador.
export default async function PaginaEditarPagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!ehSlugDePagina(slug)) notFound();
  const usuario = await exigirPapelDoPainel();
  const trilha = [{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Páginas", href: "/admin/paginas" }, { rotulo: "Editar" }];
  if (!papelPodeExecutar(usuario.papel, "paginas.editar")) {
    return (
      <>
        <CabecalhoDoPainel trilha={trilha} titulo="Editar página" descricao="Só o administrador edita as páginas institucionais." />
        <CaixaDoPainel tipo="atencao">Só o administrador edita as páginas institucionais.</CaixaDoPainel>
      </>
    );
  }
  const pagina = (await lerPaginasAgora()).find((item) => item.slug === slug);
  if (!pagina) notFound();
  return (
    <>
      <CabecalhoDoPainel trilha={trilha} titulo={`Editar: ${pagina.titulo}`} descricao={`Texto da página ${"/" + slug} do site, no mesmo formato do texto dos posts.`} />
      <FormularioDaPagina pagina={pagina} />
    </>
  );
}
