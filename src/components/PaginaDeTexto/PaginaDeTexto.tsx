import type { ReactNode } from "react";
import { CabecalhoDePagina } from "@/components/CabecalhoDePagina/CabecalhoDePagina";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import estilos from "./PaginaDeTexto.module.css";

// Página institucional só de texto (doação, associação, páginas legais):
// título e introdução no cabeçalho centralizado (29/10/2026) e corpo com
// seções, alinhado à esquerda na mesma coluna de leitura. Com "preliminar",
// mostra antes do título a faixa de versão preliminar, para textos que a
// ABTE ainda revisa.
export function PaginaDeTexto({
  titulo,
  introducao,
  preliminar = false,
  children,
}: {
  titulo: string;
  introducao: ReactNode;
  preliminar?: boolean;
  children?: ReactNode;
}) {
  return (
    <LayoutPublico header="solida">
      <div className="container pagina-interna">
        {preliminar && (
          <p role="note" className={`tipo-texto ${estilos.faixa}`}>
            Versão preliminar, em revisão pela ABTE.
          </p>
        )}
        <CabecalhoDePagina titulo={titulo} descricao={introducao} espacoAbaixo={false} />
        {children && <div className={`tipo-texto texto-corrido ${estilos.corpo}`}>{children}</div>}
      </div>
    </LayoutPublico>
  );
}
