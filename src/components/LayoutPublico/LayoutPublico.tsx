import type { ReactNode } from "react";

import { Header, type VarianteHeader } from "@/components/Header/Header";
import { NavegacaoPorAncora } from "@/components/NavegacaoPorAncora/NavegacaoPorAncora";
import { PularParaConteudo } from "@/components/PularParaConteudo/PularParaConteudo";
import { ObservadorDeRevelacao } from "@/components/Revelar/ObservadorDeRevelacao";
import { Rodape } from "@/components/Rodape/Rodape";
import { MENU_PRINCIPAL, RODAPE_LEGAL, RODAPE_MENU } from "@/config/navegacao";
import { lerPaginasEmCache } from "@/lib/dados/paginas";
import { lerConfiguracaoDoSiteEmCache } from "@/lib/dados/site";
import { ehSlugDePagina, paginaNoSite } from "@/lib/site/paginas";
import { itensDoMenu, linksDisponiveis } from "@/lib/site/configuracoes";
import estilos from "./LayoutPublico.module.css";

// Layout de todas as páginas públicas: header, conteúdo e rodapé.
// Nunca usado no /admin. Desde 30/10/2026, lê as configurações do site (em cache)
// para o menu e o rodapé.
export async function LayoutPublico({
  children,
  header = "solida",
  ocultarRodape = false,
}: {
  children: ReactNode;
  header?: VarianteHeader;
  ocultarRodape?: boolean;
}) {
  const [configuracao, paginas] = await Promise.all([lerConfiguracaoDoSiteEmCache(), lerPaginasEmCache()]);
  // Páginas legais: só as publicadas em /admin/paginas (30/10/2026).
  const legal = RODAPE_LEGAL.filter((link) => {
    const slug = link.href.slice(1);
    return !ehSlugDePagina(slug) || paginaNoSite(paginas.get(slug));
  });
  return (
    <>
      <ObservadorDeRevelacao />
      <NavegacaoPorAncora />
      <PularParaConteudo />
      <Header variante={header} menu={itensDoMenu(MENU_PRINCIPAL, configuracao)} />
      <main id="conteudo" tabIndex={-1} className={estilos.principal}>
        {children}
      </main>
      {!ocultarRodape && (
        <div className={`container ${estilos.rodapeGlobal}`}>
          <Rodape menu={linksDisponiveis(RODAPE_MENU, configuracao)} legal={legal} />
        </div>
      )}
    </>
  );
}
