import type { Metadata } from "next";

export const metadata: Metadata = { title: "Rascunhos | Artigos | Painel" };

export default function PaginaArtigosRascunhos() {
  return (
    <div>
      <h1 className="tipo-h3" style={{ marginBottom: "var(--space-24)" }}>Rascunhos (Artigos)</h1>
      <p className="tipo-texto">Lista de artigos em rascunho.</p>
    </div>
  );
}
