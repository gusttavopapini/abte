import type { Metadata } from "next";
import { Botao } from "@/components/Botao/Botao";
import { atualizarArtigo } from "@/app/admin/acoes-conteudo";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Editar Artigo | Painel" };

export default async function PaginaEditarArtigo({ params }: { params: { id: string } }) {
  const { id } = params;
  const db = firestoreAdmin();
  const doc = await db.collection("artigos").doc(id).get();
  
  if (!doc.exists) {
    redirect("/admin/artigos");
  }

  const artigo = doc.data();

  return (
    <div>
      <header style={{ marginBottom: "var(--space-32)" }}>
        <h1 className="tipo-h3" style={{ marginBottom: "var(--space-8)" }}>Editar Artigo</h1>
        <p className="tipo-texto">Atualize os dados do artigo científico.</p>
      </header>
      
      <form action={atualizarArtigo} style={{ display: "flex", flexDirection: "column", gap: "var(--space-24)", maxWidth: "800px" }}>
        <input type="hidden" name="id" value={id} />
        
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          <label htmlFor="titulo" style={{ fontWeight: 500 }}>Título do Artigo</label>
          <input 
            type="text" 
            id="titulo" 
            name="titulo" 
            defaultValue={artigo?.titulo}
            placeholder="Ex: The effect of bracing on scoliosis..."
            style={{ padding: "var(--space-12)", borderRadius: "5px", border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)", background: "transparent", color: "var(--color-text)", width: "100%", fontSize: "var(--font-size-base)" }}
            required
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          <label htmlFor="categoria" style={{ fontWeight: 500 }}>Classificação / Tipo de Artigo</label>
          <select 
            id="categoria" 
            name="categoria" 
            defaultValue={artigo?.categoria}
            style={{ padding: "var(--space-12)", borderRadius: "5px", border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)", background: "var(--color-bg)", color: "var(--color-text)", width: "100%", fontSize: "var(--font-size-base)" }}
            required
          >
            <option value="">Selecione uma categoria...</option>
            <option value="diretrizes">Diretrizes (SOSORT guidelines)</option>
            <option value="revisao-sistematica">Revisão Sistemática</option>
            <option value="colete">Uso de colete (Bracing)</option>
            <option value="exercicios">Exercícios Específicos (PSSE)</option>
            <option value="cirurgia">Cirurgia</option>
            <option value="qualidade-de-vida">Qualidade de vida / Saúde Mental</option>
            <option value="outros">Outros</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          <label htmlFor="autores" style={{ fontWeight: 500 }}>Autores / Ano</label>
          <input 
            type="text" 
            id="autores" 
            name="autores" 
            defaultValue={artigo?.autores}
            placeholder="Ex: Negrini et al., 2018"
            style={{ padding: "var(--space-12)", borderRadius: "5px", border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)", background: "transparent", color: "var(--color-text)", width: "100%", fontSize: "var(--font-size-base)" }}
            required
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          <label htmlFor="link" style={{ fontWeight: 500 }}>Link do Estudo (URL)</label>
          <input 
            type="text" 
            id="link" 
            name="link" 
            defaultValue={artigo?.link}
            placeholder="https://pubmed.ncbi.nlm.nih.gov/..."
            style={{ padding: "var(--space-12)", borderRadius: "5px", border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)", background: "transparent", color: "var(--color-text)", width: "100%", fontSize: "var(--font-size-base)" }}
            required
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          <label htmlFor="resumo" style={{ fontWeight: 500 }}>Resumo ou Pontos Principais</label>
          <textarea 
            id="resumo" 
            name="resumo" 
            defaultValue={artigo?.resumo}
            rows={10}
            placeholder="Descreva brevemente os achados do artigo..."
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
