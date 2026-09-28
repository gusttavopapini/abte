import type { Metadata } from "next";

export const metadata: Metadata = { title: "Posts Publicados | Blog | Painel" };

export default function PaginaBlogPublicados() {
  return (
    <div>
      <h1 className="tipo-h3" style={{ marginBottom: "var(--space-24)" }}>Posts Publicados (Blog)</h1>
      <p className="tipo-texto">Lista de posts que já estão no ar.</p>
    </div>
  );
}
