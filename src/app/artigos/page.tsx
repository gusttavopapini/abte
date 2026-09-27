import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";

export const metadata = { title: "Artigos Científicos | ABTE" };

export default function PaginaArtigos() {
  return (
    <LayoutPublico header="solida">
      <div className="container" style={{ paddingBlock: "var(--section-space)" }}>
        <h1 className="tipo-h1" style={{ fontWeight: 300, color: "var(--color-primary)" }}>Artigos Científicos</h1>
        <p className="tipo-texto-xl" style={{ marginTop: "var(--space-24)", fontWeight: 300 }}>Acesse nosso acervo de artigos com base científica.</p>
      </div>
    </LayoutPublico>
  );
}
