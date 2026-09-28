import type { Metadata } from "next";

export const metadata: Metadata = { title: "Rascunhos | Blog | Painel" };

export default function PaginaBlogRascunhos() {
  return (
    <div>
      <h1 className="tipo-h3" style={{ marginBottom: "var(--space-24)" }}>Rascunhos (Blog)</h1>
      <p className="tipo-texto">Lista de posts do blog em rascunho.</p>
    </div>
  );
}
