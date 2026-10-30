// Leitura das configurações do site (30/10/2026), SOMENTE no servidor, com
// o cache de dados do Next.js (etiqueta ETIQUETA_DO_SITE, revalidada pela
// ação de salvar): as páginas estáticas continuam estáticas e passam a
// mostrar a mudança logo depois de salvar, sem novo deploy. Se a leitura
// falhar, vale o padrão (Artigos no site), sem guardar a falha no cache.
import "server-only";

import { unstable_cache } from "next/cache";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import {
  COLECAO_DE_CONFIGURACOES,
  CONFIGURACAO_PADRAO_DO_SITE,
  DOCUMENTO_DO_SITE,
  ETIQUETA_DO_SITE,
  lerConfiguracaoDoSite,
  type ConfiguracaoDoSite,
} from "@/lib/site/configuracoes";

const lerEmCache = unstable_cache(
  async (): Promise<ConfiguracaoDoSite> => {
    const documento = await firestoreAdmin().collection(COLECAO_DE_CONFIGURACOES).doc(DOCUMENTO_DO_SITE).get();
    return lerConfiguracaoDoSite(documento.data());
  },
  ["configuracoes-do-site"],
  { tags: [ETIQUETA_DO_SITE] },
);

export async function lerConfiguracaoDoSiteEmCache(): Promise<ConfiguracaoDoSite> {
  try {
    return await lerEmCache();
  } catch (erro) {
    console.error("Falha ao ler as configurações do site:", erro);
    return CONFIGURACAO_PADRAO_DO_SITE;
  }
}

// Leitura direta, sem cache (painel /admin/configuracoes).
export async function lerConfiguracaoDoSiteAgora(): Promise<ConfiguracaoDoSite> {
  const documento = await firestoreAdmin().collection(COLECAO_DE_CONFIGURACOES).doc(DOCUMENTO_DO_SITE).get();
  return lerConfiguracaoDoSite(documento.data());
}
