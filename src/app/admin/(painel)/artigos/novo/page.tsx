import type { Metadata } from "next";
import { FormularioArtigo } from "@/app/admin/_componentes/FormularioArtigo/FormularioArtigo";
import { salvarArtigo } from "@/app/admin/acoes-conteudo";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { listarTopicosAtivos } from "@/lib/dados/colecoes";

export const metadata: Metadata = { title: "Novo Artigo" };

export default async function PaginaNovoArtigo() {
  await exigirPapelDoPainel();
  const [categorias, tags] = await Promise.all([listarTopicosAtivos("categoria"), listarTopicosAtivos("tag")]);

  return (
    <div>
      <CabecalhoDoPainel titulo="Adicionar Novo Artigo" descricao="Preencha os campos abaixo para catalogar um artigo científico." />
      
      <FormularioArtigo
        acao={salvarArtigo}
        categorias={categorias.map(({ id, nome }) => ({ id, nome }))}
        tags={tags.map(({ id, nome }) => ({ id, nome }))}
        rotuloPublicar="Publicar Artigo"
        rotuloRascunho="Salvar como Rascunho"
      />
    </div>
  );
}
