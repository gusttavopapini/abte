import type { Metadata } from "next";

export const metadata: Metadata = { title: "Novo Post | Blog | Painel" };

export default function PaginaBlogNovo() {
  return (
    <div>
      <h1 className="tipo-h3" style={{ marginBottom: "var(--space-24)" }}>Novo Post (Blog)</h1>
      <p className="tipo-texto">Editor para criar um novo post no blog.</p>
    </div>
  );
}
