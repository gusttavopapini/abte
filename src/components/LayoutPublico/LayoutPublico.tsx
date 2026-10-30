import type { ReactNode } from "react";

import { Header, type VarianteHeader } from "@/components/Header/Header";
import { PularParaConteudo } from "@/components/PularParaConteudo/PularParaConteudo";
import { ObservadorDeRevelacao } from "@/components/Revelar/ObservadorDeRevelacao";
import { Rodape } from "@/components/Rodape/Rodape";
import { MENU_PRINCIPAL, RODAPE_LEGAL, RODAPE_MENU } from "@/config/navegacao";
import { lerConfiguracaoDoSiteEmCache } from "@/lib/dados/site";
import { itensDoMenu, linksDisponiveis } from "@/lib/site/configuracoes";
import estilos from "./LayoutPublico.module.css";

// Layout de todas as páginas públicas: header, conteúdo e rodapé.
// Nunca usado no /admin. Com reservarFlutuantes (páginas da loja), o rodapé
// ganha embaixo o espaço dos botões flutuantes, para o fim da página nunca
// ficar sob eles. Desde 30/10/2026, lê as configurações do site (em cache)
// para o menu e o rodapé.
export async function LayoutPublico({
  children,
  header = "solida",
  ocultarRodape = false,
  reservarFlutuantes = false,
}: {
  children: ReactNode;
  header?: VarianteHeader;
  ocultarRodape?: boolean;
  reservarFlutuantes?: boolean;
}) {
  const configuracao = await lerConfiguracaoDoSiteEmCache();
  return (
    <>
      <ObservadorDeRevelacao />
      <PularParaConteudo />
      <Header variante={header} menu={itensDoMenu(MENU_PRINCIPAL, configuracao)} />
      <main id="conteudo" tabIndex={-1} className={estilos.principal}>
        {children}
      </main>
      {!ocultarRodape && (
        <div className={`container ${estilos.rodapeGlobal} ${reservarFlutuantes ? estilos.reservaFlutuantes : ""}`}>
          <Rodape menu={linksDisponiveis(RODAPE_MENU, configuracao)} legal={RODAPE_LEGAL} />
        </div>
      )}
    </>
  );
}
