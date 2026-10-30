// Leitura das páginas institucionais (30/10/2026), SOMENTE no servidor, com
// o cache de dados do Next.js (etiqueta ETIQUETA_DAS_PAGINAS, revalidada ao
// salvar). Se a leitura falhar, nenhuma página aparece (falha fechada: o
// padrão é não publicada), sem guardar a falha no cache.
import "server-only";

import { unstable_cache } from "next/cache";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { COLECAO_DE_PAGINAS, ETIQUETA_DAS_PAGINAS, PAGINAS_INSTITUCIONAIS, lerPaginaInstitucional, type PaginaInstitucional, type SlugDePagina } from "@/lib/site/paginas";

async function lerTodas(): Promise<PaginaInstitucional[]> {
  const db = firestoreAdmin();
  const documentos = await db.getAll(...PAGINAS_INSTITUCIONAIS.map((pagina) => db.collection(COLECAO_DE_PAGINAS).doc(pagina.slug)));
  return PAGINAS_INSTITUCIONAIS.map((pagina, indice) => {
    const documento = documentos[indice];
    const atualizada = documento.get("atualizadaEm");
    return lerPaginaInstitucional(pagina.slug, documento.data(), atualizada?.toDate ? atualizada.toDate().toISOString() : null);
  });
}

const lerEmCache = unstable_cache(lerTodas, ["paginas-institucionais"], { tags: [ETIQUETA_DAS_PAGINAS] });

export async function lerPaginasEmCache(): Promise<Map<SlugDePagina, PaginaInstitucional>> {
  try {
    return new Map((await lerEmCache()).map((pagina) => [pagina.slug, pagina]));
  } catch (erro) {
    console.error("Falha ao ler as páginas institucionais:", erro);
    return new Map();
  }
}

// Leitura direta, sem cache (painel /admin/paginas).
export async function lerPaginasAgora(): Promise<PaginaInstitucional[]> {
  return lerTodas();
}
