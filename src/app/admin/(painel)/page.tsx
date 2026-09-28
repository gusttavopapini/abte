import type { Metadata } from "next";

export const metadata: Metadata = { title: "Visão Geral | Painel" };

export default function PaginaPainel() {
  return (
    <div>
      <h1 className="tipo-h3" style={{ marginBottom: "var(--space-24)" }}>
        Bem-vindo ao Painel da ABTE
      </h1>
      <p className="tipo-texto">
        Utilize o menu lateral para gerenciar as publicações do Blog e os Artigos Científicos.
      </p>
    </div>
  );
}
