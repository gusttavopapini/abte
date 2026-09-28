import type { Metadata } from "next";

export const metadata: Metadata = { title: "Novo Artigo | Painel" };

export default function PaginaArtigosNovo() {
  return (
    <div>
      <h1 className="tipo-h3" style={{ marginBottom: "var(--space-24)" }}>Novo Artigo</h1>
      <p className="tipo-texto">Editor para criar um novo artigo científico.</p>
    </div>
  );
}
