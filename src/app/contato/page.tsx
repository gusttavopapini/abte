import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { BlocoContato } from "@/components/BlocoContato/BlocoContato";
import { Rodape } from "@/components/Rodape/Rodape";
import estilos from "./page.module.css";

export const metadata = { title: "Contato | ABTE" };

export default function PaginaContato() {
  return (
    <LayoutPublico header="solida" ocultarRodape>
      <div className={`container ${estilos.containerContato}`}>
        <BlocoContato />
        <Rodape />
      </div>
    </LayoutPublico>
  );
}
