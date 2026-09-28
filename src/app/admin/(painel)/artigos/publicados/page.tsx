import type { Metadata } from "next";

export const metadata: Metadata = { title: "Artigos Publicados | Painel" };

export default function PaginaArtigosPublicados() {
  return (
    <div>
      <h1 className="tipo-h3" style={{ marginBottom: "var(--space-24)" }}>Artigos Publicados</h1>
      <p className="tipo-texto">Lista de artigos que já estão no ar.</p>
    </div>
  );
}
