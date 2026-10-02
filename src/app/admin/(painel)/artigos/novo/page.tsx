import type { Metadata } from "next";
import { FormularioArtigo } from "@/app/admin/_componentes/FormularioArtigo/FormularioArtigo";
import { salvarArtigo } from "@/app/admin/acoes-conteudo";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";

export const metadata: Metadata = { title: "Novo Artigo" };

export default function PaginaNovoArtigo() {
  return (
    <div>
      <CabecalhoDoPainel titulo="Adicionar Novo Artigo" descricao="Preencha os campos abaixo para catalogar um artigo científico." />
      
      <FormularioArtigo acao={salvarArtigo} rotuloPublicar="Publicar Artigo" rotuloRascunho="Salvar como Rascunho" />
    </div>
  );
}
