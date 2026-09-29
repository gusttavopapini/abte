import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { BlocoContato } from "@/components/BlocoContato/BlocoContato";
import estilos from "./page.module.css";

export const metadata = { title: "Contato | ABTE" };

export default function PaginaContato() {
  return (
    <LayoutPublico header="solida">
      <div className={`container ${estilos.containerForm}`}>
        <div className={estilos.formularioCentralizado}>
          <BlocoContato />
        </div>
      </div>
    </LayoutPublico>
  );
}
