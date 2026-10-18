import type { ReactNode } from "react";
import { LayoutPublico } from "@/components/LayoutPublico/LayoutPublico";
import estilos from "./PaginaDeTexto.module.css";

// Página institucional só de texto (doação, associação, páginas legais):
// título, introdução e corpo com seções. Com "preliminar", mostra antes do
// título a faixa de versão preliminar, para textos que a ABTE ainda revisa.
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
      <div className={`container ${estilos.secao}`}>
        {preliminar && (
          <p role="note" className={`tipo-texto ${estilos.faixa}`}>
            Versão preliminar, em revisão pela ABTE.
          </p>
        )}
        <h1 className={`tipo-h1 ${estilos.titulo}`}>{titulo}</h1>
        <div className={`tipo-texto-lg ${estilos.introducao}`}>{introducao}</div>
        {children && <div className={`tipo-texto ${estilos.corpo}`}>{children}</div>}
      </div>
    </LayoutPublico>
  );
}
