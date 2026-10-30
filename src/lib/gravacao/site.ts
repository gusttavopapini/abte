// Gravação das configurações do site (30/10/2026) em configuracoes/site, com
// o registro em logAlteracoes na mesma transação. Sem server-only, como as
// outras gravações: quem chama (acoes-configuracoes.ts) confere sessão e
// papel antes. O registro leva só o nome do campo, nunca o valor.
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { registrarNaTransacao, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { COLECAO_DE_CONFIGURACOES, DOCUMENTO_DO_SITE, lerConfiguracaoDoSite } from "../site/configuracoes.ts";

function referencia(db: Firestore) {
  return db.collection(COLECAO_DE_CONFIGURACOES).doc(DOCUMENTO_DO_SITE);
}

// Exibir ou esconder os Artigos no site.
export async function salvarArtigosAtivo(db: Firestore, artigosAtivo: boolean, autor: AutorDaAlteracao): Promise<{ ok: true; mudou: boolean }> {
  return db.runTransaction(async (transacao) => {
    const antes = lerConfiguracaoDoSite((await transacao.get(referencia(db))).data());
    const mudou = antes.artigosAtivo !== artigosAtivo;
    transacao.set(referencia(db), { artigosAtivo, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    registrarNaTransacao(db, transacao, autor, {
      colecao: COLECAO_DE_CONFIGURACOES,
      documentoId: DOCUMENTO_DO_SITE,
      acao: "editar",
      campos: mudou ? ["artigosAtivo"] : [],
      resumo: mudou ? (artigosAtivo ? "Artigos exibidos no site." : "Artigos escondidos do site.") : "Configuração dos Artigos salva sem alterações.",
    });
    return { ok: true, mudou };
  });
}
