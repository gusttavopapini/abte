import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";

export const metadata = { title: "Contato | ABTE" };

export default function PaginaContato() {
  return (
    <LayoutPublico header="solida">
      <div className="container" style={{ paddingBlock: "var(--section-space)" }}>
        <h1 className="tipo-h1" style={{ fontWeight: 300, color: "var(--color-primary)" }}>Contato</h1>
        <p className="tipo-texto-xl" style={{ marginTop: "var(--space-24)", fontWeight: 300 }}>Entre em contato com a Associação Brasileira de Tratamento da Escoliose.</p>
      </div>
    </LayoutPublico>
  );
}
