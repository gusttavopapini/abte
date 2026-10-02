import type { Metadata } from "next";
import { FormularioArtigo } from "@/app/admin/_componentes/FormularioArtigo/FormularioArtigo";
import { salvarArtigo } from "@/app/admin/acoes-conteudo";

export const metadata: Metadata = { title: "Novo Artigo" };

export default function PaginaNovoArtigo() {
  return (
    <div>
      <header style={{ marginBottom: "var(--space-32)" }}>
        <h1 className="tipo-h3" style={{ marginBottom: "var(--space-8)" }}>Adicionar Novo Artigo</h1>
        <p className="tipo-texto">Preencha os campos abaixo para catalogar um artigo científico.</p>
      </header>
      
      <FormularioArtigo acao={salvarArtigo} rotuloPublicar="Publicar Artigo" rotuloRascunho="Salvar como Rascunho" />
    </div>
  );
}
