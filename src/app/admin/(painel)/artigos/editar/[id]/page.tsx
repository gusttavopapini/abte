import type { Metadata } from "next";
import { FormularioArtigo } from "@/app/admin/_componentes/FormularioArtigo/FormularioArtigo";
import { atualizarArtigo } from "@/app/admin/acoes-conteudo";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerArtigos, listarTopicosAtivos } from "@/lib/dados/colecoes";
import { opcoesDeCategoriaNoPainel } from "@/lib/topicos";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import { ehIdDeDocumentoValido } from "@/lib/validacao";
import { redirect } from "next/navigation";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";

export const metadata: Metadata = { title: "Editar Artigo" };

export default async function PaginaEditarArtigo({ params }: { params: Promise<{ id: string }> }) {
  await exigirPapelDoPainel();
  const { id } = await params;
  // Id inválido é tratado como registro inexistente: volta para a lista.
  if (!ehIdDeDocumentoValido(id)) redirect("/admin/artigos");
  const artigo = (await lerArtigos().doc(id).get()).data();
  if (!artigo) redirect("/admin/artigos");
  const [categorias, tags] = await Promise.all([listarTopicosAtivos("categoria"), listarTopicosAtivos("tag")]);
  const imagem = artigo.imagemMidiaId ? { id: artigo.imagemMidiaId, imagem: (await imagensAtivasPorId([artigo.imagemMidiaId])).get(artigo.imagemMidiaId) ?? null } : null;

  return (
    <div>
      <CabecalhoDoPainel titulo="Editar Artigo" descricao="Atualize os dados do artigo científico." />
      
      <FormularioArtigo
        acao={atualizarArtigo}
        artigo={{ id: artigo.id, titulo: artigo.titulo, categoria: artigo.categoria, tags: artigo.tags, autores: artigo.autores, link: artigo.link, resumo: artigo.resumo }}
        imagem={imagem}
        categorias={opcoesDeCategoriaNoPainel(categorias)}
        tags={tags.map(({ id, nome }) => ({ id, nome }))}
        rotuloPublicar="Atualizar e Publicar"
        rotuloRascunho="Reverter para Rascunho"
      />
    </div>
  );
}
