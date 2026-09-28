import type { Metadata } from "next";
import Link from "next/link";
import { Botao } from "@/components/Botao/Botao";

export const metadata: Metadata = { title: "Blog | Painel" };

export default function PaginaAdminBlog() {
  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-32)" }}>
        <div>
          <h1 className="tipo-h3" style={{ marginBottom: "var(--space-8)" }}>Blog</h1>
          <p className="tipo-texto">Gerencie os posts publicados e rascunhos.</p>
        </div>
        <Botao href="/admin/blog/novo">Adicionar Novo Post</Botao>
      </header>
      
      <div style={{ background: "var(--color-surface-soft)", padding: "var(--space-24)", borderRadius: "5px" }}>
        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)" }}>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Título</th>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Status</th>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Data</th>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} style={{ paddingTop: "var(--space-24)", textAlign: "center", opacity: 0.7 }}>
                Nenhum post encontrado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
