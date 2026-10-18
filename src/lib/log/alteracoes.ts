// Registro de alterações (logAlteracoes): versão mínima da etapa 4d, usada só
// pela biblioteca de mídia. Gravado só pelo servidor (Admin SDK), nunca editado.
// Recebe o Firestore por parâmetro, sem depender do Next.js: usado pelas ações
// de servidor, pelo script de migração e pelos testes no emulador.
import { FieldValue, type Firestore, type WriteBatch } from "firebase-admin/firestore";
import type { PapelDoPainel } from "../auth/papeis.ts";

export const COLECAO_LOG = "logAlteracoes";

// "excluir_definitivo" é extensão ao enum do modelo de dados (registrada no
// CLAUDE.md para atualizar o documento do modelo).
export type AcaoDoLog = "criar" | "editar" | "excluir" | "restaurar" | "excluir_definitivo";

// Quem fez a alteração. Nunca o e-mail: só o uid, o nome do cadastro e o papel.
export type AutorDaAlteracao = { uid: string; nome: string; papel: PapelDoPainel };

export type Alteracao = {
  colecao: string;
  documentoId: string;
  acao: AcaoDoLog;
  // Nomes dos campos alterados, sem os valores.
  campos: string[];
  // Frase curta em português, sem dado pessoal.
  resumo: string;
};

function dadosDoRegistro(autor: AutorDaAlteracao, alteracao: Alteracao) {
  return {
    usuarioId: autor.uid,
    usuarioNome: autor.nome,
    papel: autor.papel,
    colecao: alteracao.colecao,
    documentoId: alteracao.documentoId,
    acao: alteracao.acao,
    campos: alteracao.campos,
    resumo: alteracao.resumo,
    criadoEm: FieldValue.serverTimestamp(),
  };
}

// Acrescenta o registro a um lote de gravação, para ser salvo junto com a
// própria alteração (os dois entram ou nenhum entra).
export function registrarNoLote(db: Firestore, lote: WriteBatch, autor: AutorDaAlteracao, alteracao: Alteracao): void {
  lote.create(db.collection(COLECAO_LOG).doc(), dadosDoRegistro(autor, alteracao));
}
