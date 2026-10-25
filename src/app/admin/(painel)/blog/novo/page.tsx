import type { Metadata } from "next";
import { FormularioPost } from "@/app/admin/_componentes/FormularioPost/FormularioPost";
import { salvarPost } from "@/app/admin/acoes-conteudo";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { listarTopicosAtivos } from "@/lib/dados/colecoes";
import { opcoesDeCategoriaNoPainel } from "@/lib/topicos";

export const metadata: Metadata = { title: "Novo Post | Blog" };

export default async function PaginaNovoPost() {
  await exigirPapelDoPainel();
  const [categorias, tags] = await Promise.all([listarTopicosAtivos("categoriaDePost"), listarTopicosAtivos("tagDePost")]);

  return (
    <div>
      <CabecalhoDoPainel titulo="Adicionar Novo Post" descricao="Preencha os campos abaixo para criar uma publicação no blog." />
      
      <FormularioPost
        acao={salvarPost}
        capa={null}
        categorias={opcoesDeCategoriaNoPainel(categorias)}
        tags={tags.map(({ id, nome }) => ({ id, nome }))}
        rotuloPublicar="Publicar Post"
        rotuloRascunho="Salvar como Rascunho"
      />
    </div>
  );
}
