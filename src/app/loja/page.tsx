import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import estilos from "./page.module.css";

export const metadata = { title: "Loja" };

export default function PaginaLoja() {
  return (
    <LayoutPublico header="solida">
      <div className={`container ${estilos.secao}`}>
        <h1 className={`tipo-h1 ${estilos.titulo}`}>Loja da ABTE</h1>
        <p className={`tipo-texto-xl ${estilos.descricao}`}>Conheça nossos produtos. Cada compra apoia pacientes com escoliose.</p>
      </div>
    </LayoutPublico>
  );
}
