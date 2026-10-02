import type { Metadata } from "next";
import { FormularioPost } from "@/app/admin/_componentes/FormularioPost/FormularioPost";
import { atualizarPost } from "@/app/admin/acoes-conteudo";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerPosts } from "@/lib/dados/colecoes";
import { ehIdDeDocumentoValido } from "@/lib/validacao";
import { redirect } from "next/navigation";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";

export const metadata: Metadata = { title: "Editar Post | Blog" };

export default async function PaginaEditarPost({ params }: { params: Promise<{ id: string }> }) {
  await exigirPapelDoPainel();
  const { id } = await params;
  // Id inválido é tratado como registro inexistente: volta para a lista.
  if (!ehIdDeDocumentoValido(id)) redirect("/admin/blog");
  const post = (await lerPosts().doc(id).get()).data();
  if (!post) redirect("/admin/blog");

  return (
    <div>
      <CabecalhoDoPainel titulo="Editar Post" descricao="Atualize os dados da publicação." />
      
      <FormularioPost acao={atualizarPost} post={post} rotuloPublicar="Atualizar e Publicar" rotuloRascunho="Reverter para Rascunho" />
    </div>
  );
}
