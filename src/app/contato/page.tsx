import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import { BlocoContato } from "@/components/BlocoContato/BlocoContato";
import estilos from "./page.module.css";

export const metadata = { title: "Contato" };

export default function PaginaContato() {
  return (
    <LayoutPublico header="solida">
      {/* Único H1 da página, só para leitores de tela: o título visível é o do bloco de contato. */}
      <h1 className="somente-leitor">Contato</h1>
      <div className={`container ${estilos.containerForm}`}>
        <div className={estilos.formularioCentralizado}>
          <BlocoContato />
        </div>
      </div>
    </LayoutPublico>
  );
}
