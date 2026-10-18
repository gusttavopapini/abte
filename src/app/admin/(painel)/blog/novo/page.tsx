import type { Metadata } from "next";
import { FormularioPost } from "@/app/admin/_componentes/FormularioPost/FormularioPost";
import { salvarPost } from "@/app/admin/acoes-conteudo";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";

export const metadata: Metadata = { title: "Novo Post | Blog" };

export default function PaginaNovoPost() {
  return (
    <div>
      <CabecalhoDoPainel titulo="Adicionar Novo Post" descricao="Preencha os campos abaixo para criar uma publicação no blog." />
      
      <FormularioPost acao={salvarPost} capa={null} rotuloPublicar="Publicar Post" rotuloRascunho="Salvar como Rascunho" />
    </div>
  );
}
