import type { Metadata } from "next";
import { FormularioPost } from "@/app/admin/_componentes/FormularioPost/FormularioPost";
import { salvarPost } from "@/app/admin/acoes-conteudo";

export const metadata: Metadata = { title: "Novo Post | Blog" };

export default function PaginaNovoPost() {
  return (
    <div>
      <header style={{ marginBottom: "var(--space-32)" }}>
        <h1 className="tipo-h3" style={{ marginBottom: "var(--space-8)" }}>Adicionar Novo Post</h1>
        <p className="tipo-texto">Preencha os campos abaixo para criar uma publicação no blog.</p>
      </header>
      
      <FormularioPost acao={salvarPost} rotuloPublicar="Publicar Post" rotuloRascunho="Salvar como Rascunho" />
    </div>
  );
}
