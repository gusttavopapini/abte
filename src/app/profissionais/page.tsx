import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";

export const metadata = { title: "Profissionais | ABTE" };

export default function PaginaProfissionais() {
  return (
    <LayoutPublico header="solida">
      <div className="container" style={{ paddingBlock: "var(--section-space)" }}>
        <h1 className="tipo-h1" style={{ fontWeight: 300, color: "var(--color-primary)" }}>Profissionais</h1>
        <p className="tipo-texto-xl" style={{ marginTop: "var(--space-24)", fontWeight: 300 }}>Encontre fisioterapeutas, médicos e especialistas certificados.</p>
      </div>
    </LayoutPublico>
  );
}
