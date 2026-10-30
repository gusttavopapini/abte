// Gravação das páginas institucionais (30/10/2026) em
// paginasInstitucionais/{slug}, com o registro em logAlteracoes na mesma
// transação (só os nomes dos campos). Sem server-only, como as outras
// gravações: quem chama (acoes-paginas.ts) confere sessão e papel antes.
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { registrarNaTransacao, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { COLECAO_DE_PAGINAS, PAGINAS_INSTITUCIONAIS, camposAlteradosDaPagina, lerPaginaInstitucional, type SlugDePagina } from "../site/paginas.ts";

export async function salvarPaginaInstitucional(
  db: Firestore,
  slug: SlugDePagina,
  dados: { titulo: string; corpo: string; publicada: boolean },
  autor: AutorDaAlteracao,
): Promise<{ ok: true; nome: string; alterados: string[] }> {
  const referencia = db.collection(COLECAO_DE_PAGINAS).doc(slug);
  const nome = PAGINAS_INSTITUCIONAIS.find((pagina) => pagina.slug === slug)?.tituloPadrao ?? slug;
  return db.runTransaction(async (transacao) => {
    const documento = await transacao.get(referencia);
    const antes = documento.exists ? lerPaginaInstitucional(slug, documento.data()) : null;
    const alterados = camposAlteradosDaPagina(antes, dados);
    transacao.set(referencia, { ...dados, atualizadaEm: FieldValue.serverTimestamp(), ...(documento.exists ? {} : { criadaEm: FieldValue.serverTimestamp() }) }, { merge: true });
    registrarNaTransacao(db, transacao, autor, {
      colecao: COLECAO_DE_PAGINAS,
      documentoId: slug,
      acao: documento.exists ? "editar" : "criar",
      campos: alterados,
      resumo: alterados.length > 0 ? `${nome}: ${alterados.join(", ")}.` : `${nome} salva sem alterações.`,
    });
    return { ok: true, nome, alterados };
  });
}
