import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";

export const metadata = { title: "Loja | ABTE" };

export default function PaginaLoja() {
  return (
    <LayoutPublico header="solida">
      <div className="container" style={{ paddingBlock: "var(--section-space)" }}>
        <h1 className="tipo-h1" style={{ fontWeight: 300, color: "var(--color-primary)" }}>Loja da ABTE</h1>
        <p className="tipo-texto-xl" style={{ marginTop: "var(--space-24)", fontWeight: 300 }}>Conheça nossos produtos. Cada compra apoia pacientes com escoliose.</p>
      </div>
    </LayoutPublico>
  );
}
