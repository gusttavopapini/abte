// Gravação dos cupons (21/11/2026), com o registro de alterações na mesma
// transação. Firestore por parâmetro, sem server-only (testes no emulador).
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { registrarNaTransacao, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { COLECAO_CUPONS, codigoValido } from "../loja/cupons.ts";

export async function criarCupom(db: Firestore, cupom: { codigo: string; percentual: number; ativo: boolean }, autor: AutorDaAlteracao): Promise<string | null> {
  if (!codigoValido(cupom.codigo)) return "Código inválido.";
  const referencia = db.collection(COLECAO_CUPONS).doc(cupom.codigo);
  return db.runTransaction(async (transacao) => {
    if ((await transacao.get(referencia)).exists) return `Já existe um cupom com o código ${cupom.codigo}.`;
    transacao.create(referencia, {
      codigo: cupom.codigo,
      percentual: cupom.percentual,
      ativo: cupom.ativo,
      usos: 0,
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    registrarNaTransacao(db, transacao, autor, { colecao: COLECAO_CUPONS, documentoId: cupom.codigo, acao: "criar", campos: ["codigo", "percentual", "ativo"], resumo: "Cupom criado." });
    return null;
  });
}

export async function atualizarCupom(db: Firestore, codigo: string, mudancas: { percentual: number; ativo: boolean }, autor: AutorDaAlteracao): Promise<string | null> {
  if (!codigoValido(codigo)) return "Cupom não encontrado.";
  const referencia = db.collection(COLECAO_CUPONS).doc(codigo);
  return db.runTransaction(async (transacao) => {
    const atual = await transacao.get(referencia);
    if (!atual.exists) return "Cupom não encontrado.";
    const campos: string[] = [];
    if (atual.get("percentual") !== mudancas.percentual) campos.push("percentual");
    if (atual.get("ativo") !== mudancas.ativo) campos.push("ativo");
    transacao.update(referencia, { percentual: mudancas.percentual, ativo: mudancas.ativo, atualizadoEm: FieldValue.serverTimestamp() });
    registrarNaTransacao(db, transacao, autor, {
      colecao: COLECAO_CUPONS,
      documentoId: codigo,
      acao: "editar",
      campos,
      resumo: campos.length === 0 ? "Cupom salvo sem alterações." : `Cupom alterado: ${campos.join(", ")}.`,
    });
    return null;
  });
}

// Excluir de vez (pedidos antigos guardam o código e o percentual).
export async function excluirCupom(db: Firestore, codigo: string, autor: AutorDaAlteracao): Promise<string | null> {
  if (!codigoValido(codigo)) return "Cupom não encontrado.";
  const referencia = db.collection(COLECAO_CUPONS).doc(codigo);
  return db.runTransaction(async (transacao) => {
    if (!(await transacao.get(referencia)).exists) return "Cupom não encontrado.";
    transacao.delete(referencia);
    registrarNaTransacao(db, transacao, autor, { colecao: COLECAO_CUPONS, documentoId: codigo, acao: "excluir_definitivo", campos: [], resumo: "Cupom excluído." });
    return null;
  });
}
