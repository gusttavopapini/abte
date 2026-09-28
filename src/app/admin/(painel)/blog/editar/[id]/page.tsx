import type { Metadata } from "next";
import { Botao } from "@/components/Botao/Botao";
import { atualizarPost } from "@/app/admin/acoes-conteudo";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Editar Post | Blog | Painel" };

export default async function PaginaEditarPost({ params }: { params: { id: string } }) {
  const { id } = params;
  const db = firestoreAdmin();
  const doc = await db.collection("posts").doc(id).get();
  
  if (!doc.exists) {
    redirect("/admin/blog");
  }

  const post = doc.data();

  return (
    <div>
      <header style={{ marginBottom: "var(--space-32)" }}>
        <h1 className="tipo-h3" style={{ marginBottom: "var(--space-8)" }}>Editar Post</h1>
        <p className="tipo-texto">Atualize os dados da publicação.</p>
      </header>
      
      <form action={atualizarPost} style={{ display: "flex", flexDirection: "column", gap: "var(--space-24)", maxWidth: "800px" }}>
        <input type="hidden" name="id" value={id} />
        
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          <label htmlFor="titulo" style={{ fontWeight: 500 }}>Título do Post</label>
          <input 
            type="text" 
            id="titulo" 
            name="titulo" 
            defaultValue={post?.titulo}
            placeholder="Ex: Novo tratamento para escoliose..."
            style={{ padding: "var(--space-12)", borderRadius: "5px", border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)", background: "transparent", color: "var(--color-text)", width: "100%", fontSize: "var(--font-size-base)" }}
            required
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          <label htmlFor="imagem" style={{ fontWeight: 500 }}>Imagem de Capa (URL)</label>
          <input 
            type="text" 
            id="imagem" 
            name="imagem" 
            defaultValue={post?.imagem}
            placeholder="https://exemplo.com/imagem.jpg"
            style={{ padding: "var(--space-12)", borderRadius: "5px", border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)", background: "transparent", color: "var(--color-text)", width: "100%", fontSize: "var(--font-size-base)" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          <label htmlFor="conteudo" style={{ fontWeight: 500 }}>Conteúdo</label>
          <textarea 
            id="conteudo" 
            name="conteudo" 
            defaultValue={post?.conteudo}
            rows={15}
            placeholder="Escreva o conteúdo do post aqui..."
            style={{ padding: "var(--space-12)", borderRadius: "5px", border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)", background: "transparent", color: "var(--color-text)", width: "100%", fontSize: "var(--font-size-base)", resize: "vertical" }}
            required
          />
        </div>

        <div style={{ display: "flex", gap: "var(--space-16)", marginTop: "var(--space-16)" }}>
          <Botao type="submit" name="acao" value="publicar" variante="primario">Atualizar e Publicar</Botao>
          <Botao type="submit" name="acao" value="rascunho" variante="secundario">Reverter para Rascunho</Botao>
        </div>

      </form>
    </div>
  );
}
