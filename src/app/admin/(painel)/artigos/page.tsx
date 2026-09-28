import type { Metadata } from "next";
import Link from "next/link";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { Botao } from "@/components/Botao/Botao";

export const metadata: Metadata = { title: "Artigos | Painel" };

type ArtigoCatalogo = {
  id: string;
  titulo: string;
  categoria: string;
  status: string;
  criadoEm?: { toDate?: () => Date };
};

export default async function PaginaAdminArtigos() {
  const db = firestoreAdmin();
  const snapshot = await db.collection("artigos").orderBy("criadoEm", "desc").get();
  
  const artigos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ArtigoCatalogo[];

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-32)" }}>
        <div>
          <h1 className="tipo-h3" style={{ marginBottom: "var(--space-8)" }}>Artigos Científicos</h1>
          <p className="tipo-texto">Gerencie os artigos publicados e rascunhos.</p>
        </div>
        <Botao href="/admin/artigos/novo">Adicionar Novo Artigo</Botao>
      </header>
      
      <div style={{ background: "var(--color-surface-soft)", padding: "var(--space-24)", borderRadius: "5px" }}>
        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)" }}>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Título</th>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Categoria</th>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Status</th>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {artigos.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ paddingTop: "var(--space-24)", textAlign: "center", opacity: 0.7 }}>
                  Nenhum artigo encontrado.
                </td>
              </tr>
            ) : (
              artigos.map((artigo: ArtigoCatalogo) => (
                <tr key={artigo.id} style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-text) 5%, transparent)" }}>
                  <td style={{ padding: "var(--space-16) 0", fontWeight: 500 }}>{artigo.titulo}</td>
                  <td style={{ padding: "var(--space-16) 0", opacity: 0.8, textTransform: "capitalize" }}>{artigo.categoria?.replace("-", " ")}</td>
                  <td style={{ padding: "var(--space-16) 0" }}>
                    <span style={{ 
                      display: "inline-block", 
                      padding: "4px 8px", 
                      borderRadius: "4px", 
                      fontSize: "12px",
                      textTransform: "uppercase",
                      background: artigo.status === "publicado" ? "rgba(46, 204, 113, 0.2)" : "rgba(241, 196, 15, 0.2)",
                      color: artigo.status === "publicado" ? "#27ae60" : "#d35400"
                    }}>
                      {artigo.status}
                    </span>
                  </td>
                  <td style={{ padding: "var(--space-16) 0" }}>
                    <Link href={`/admin/artigos/editar/${artigo.id}`} style={{ fontSize: "14px", textDecoration: "underline", color: "var(--color-primary)" }}>
                      Editar
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
