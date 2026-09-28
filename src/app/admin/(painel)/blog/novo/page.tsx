import type { Metadata } from "next";
import { Botao } from "@/components/Botao/Botao";

export const metadata: Metadata = { title: "Novo Post | Blog | Painel" };

export default function PaginaNovoPost() {
  return (
    <div>
      <header style={{ marginBottom: "var(--space-32)" }}>
        <h1 className="tipo-h3" style={{ marginBottom: "var(--space-8)" }}>Adicionar Novo Post</h1>
        <p className="tipo-texto">Preencha os campos abaixo para criar uma publicação no blog.</p>
      </header>
      
      <form style={{ display: "flex", flexDirection: "column", gap: "var(--space-24)", maxWidth: "800px" }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          <label htmlFor="titulo" style={{ fontWeight: 500 }}>Título do Post</label>
          <input 
            type="text" 
            id="titulo" 
            name="titulo" 
            placeholder="Ex: Novo tratamento para escoliose..."
            style={{ padding: "var(--space-12)", borderRadius: "5px", border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)", background: "transparent", color: "var(--color-text)", width: "100%", fontSize: "var(--font-size-base)" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          <label htmlFor="imagem" style={{ fontWeight: 500 }}>Imagem de Capa (URL)</label>
          <input 
            type="text" 
            id="imagem" 
            name="imagem" 
            placeholder="https://exemplo.com/imagem.jpg"
            style={{ padding: "var(--space-12)", borderRadius: "5px", border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)", background: "transparent", color: "var(--color-text)", width: "100%", fontSize: "var(--font-size-base)" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          <label htmlFor="conteudo" style={{ fontWeight: 500 }}>Conteúdo</label>
          <textarea 
            id="conteudo" 
            name="conteudo" 
            rows={15}
            placeholder="Escreva o conteúdo do post aqui..."
            style={{ padding: "var(--space-12)", borderRadius: "5px", border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)", background: "transparent", color: "var(--color-text)", width: "100%", fontSize: "var(--font-size-base)", resize: "vertical" }}
          />
        </div>

        <div style={{ display: "flex", gap: "var(--space-16)", marginTop: "var(--space-16)" }}>
          <Botao type="button" variante="primario">Publicar Post</Botao>
          <Botao type="button" variante="secundario">Salvar como Rascunho</Botao>
        </div>

      </form>
    </div>
  );
}
