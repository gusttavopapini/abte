import type { ReactNode } from "react";
import { BlocoContato } from "@/components/BlocoContato/BlocoContato";
import { Header, type VarianteHeader } from "@/components/Header/Header";
import { PularParaConteudo } from "@/components/PularParaConteudo/PularParaConteudo";
import { Rodape } from "@/components/Rodape/Rodape";
import estilos from "./LayoutPublico.module.css";

// Layout de todas as páginas públicas: header, conteúdo, bloco de contato e
// rodapé. Nunca usado no /admin.
export function LayoutPublico({ children, header = "solida" }: { children: ReactNode; header?: VarianteHeader }) {
  return (
    <>
      <PularParaConteudo />
      <Header variante={header} />
      <main id="conteudo" tabIndex={-1} className={estilos.principal}>
        {children}
      </main>
      {/* Contato e rodapé: 2 colunas a partir de 768px, 1 coluna no celular
          com o contato acima (design-system.md seção 9, PROPOSTA) */}
      <div className={`container ${estilos.fim}`}>
        <BlocoContato />
        <Rodape />
      </div>
    </>
  );
}
