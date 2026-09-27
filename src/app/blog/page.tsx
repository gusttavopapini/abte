import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";

export const metadata = { title: "Blog | ABTE" };

export default function PaginaBlog() {
  return (
    <LayoutPublico header="solida">
      <div className="container" style={{ paddingBlock: "var(--section-space)" }}>
        <h1 className="tipo-h1" style={{ fontWeight: 300, color: "var(--color-primary)" }}>Blog</h1>
        <p className="tipo-texto-xl" style={{ marginTop: "var(--space-24)", fontWeight: 300 }}>Acompanhe as últimas novidades e dicas sobre tratamento da escoliose.</p>
      </div>
    </LayoutPublico>
  );
}
