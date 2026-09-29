import type { ReactNode } from "react";

import { Header, type VarianteHeader } from "@/components/Header/Header";
import { PularParaConteudo } from "@/components/PularParaConteudo/PularParaConteudo";
import { Rodape } from "@/components/Rodape/Rodape";
import estilos from "./LayoutPublico.module.css";

// Layout de todas as páginas públicas: header, conteúdo, bloco de contato e
// rodapé. Nunca usado no /admin.
export function LayoutPublico({ children, header = "solida", ocultarRodape = false }: { children: ReactNode; header?: VarianteHeader; ocultarRodape?: boolean }) {
  return (
    <>
      <PularParaConteudo />
      <Header variante={header} />
      <main id="conteudo" tabIndex={-1} className={estilos.principal}>
        {children}
      </main>
      {!ocultarRodape && (
        <div className={`container ${estilos.rodapeGlobal}`}>
          <Rodape />
        </div>
      )}
    </>
  );
}
