import type { Metadata } from "next";
import { FormularioArtigo } from "@/app/admin/_componentes/FormularioArtigo/FormularioArtigo";
import { atualizarArtigo } from "@/app/admin/acoes-conteudo";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerArtigos } from "@/lib/dados/colecoes";
import { ehIdDeDocumentoValido } from "@/lib/validacao";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Editar Artigo" };

export default async function PaginaEditarArtigo({ params }: { params: Promise<{ id: string }> }) {
  await exigirPapelDoPainel();
  const { id } = await params;
  // Id inválido é tratado como registro inexistente: volta para a lista.
  if (!ehIdDeDocumentoValido(id)) redirect("/admin/artigos");
  const artigo = (await lerArtigos().doc(id).get()).data();
  if (!artigo) redirect("/admin/artigos");

  return (
    <div>
      <header style={{ marginBottom: "var(--space-32)" }}>
        <h1 className="tipo-h3" style={{ marginBottom: "var(--space-8)" }}>Editar Artigo</h1>
        <p className="tipo-texto">Atualize os dados do artigo científico.</p>
      </header>
      
      <FormularioArtigo acao={atualizarArtigo} artigo={artigo} rotuloPublicar="Atualizar e Publicar" rotuloRascunho="Reverter para Rascunho" />
    </div>
  );
}
