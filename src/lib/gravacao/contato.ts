// Mensagens do formulário de contato (08/11/2026): gravação pelo servidor,
// leitura e "Marcar como lida" no painel, com o registro de alterações. Sem
// server-only, como as outras gravações: quem chama confere sessão e papel
// (no painel) ou é a ação pública do formulário. O Firestore chega por
// parâmetro (os testes usam o emulador).
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { registrarNaTransacao, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { COLECAO_DE_MENSAGENS, envioMuitoRecente, type MensagemDeContatoValida } from "../contato.ts";
import { ehIdDeDocumentoValido } from "../validacao.ts";

export type MensagemDeContatoNoPainel = {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  assunto: string;
  mensagem: string;
  criadoEm: string | null;
  lida: boolean;
  lidaEm: string | null;
};

// Limite da lista do painel (as mais recentes primeiro).
export const LIMITE_DA_LISTA_DE_MENSAGENS = 200;

function momento(valor: unknown): number {
  return valor instanceof Timestamp ? valor.toMillis() : NaN;
}

// Grava a mensagem já validada. Na mesma transação, confere o envio
// repetido: o mesmo e-mail há menos de um minuto é recusado. A consulta é só
// pelo e-mail (índice simples); a data é conferida na memória.
export async function gravarMensagemDeContato(
  db: Firestore,
  dados: MensagemDeContatoValida,
  agora: number = Date.now(),
): Promise<{ ok: true; id: string } | { ok: false; motivo: "repetida" }> {
  const colecao = db.collection(COLECAO_DE_MENSAGENS);
  return db.runTransaction(async (transacao) => {
    const anteriores = await transacao.get(colecao.where("email", "==", dados.email));
    if (envioMuitoRecente(anteriores.docs.map((documento) => momento(documento.get("criadoEm"))), agora)) return { ok: false, motivo: "repetida" } as const;
    const referencia = colecao.doc();
    transacao.create(referencia, {
      nome: dados.nome,
      sobrenome: dados.sobrenome,
      email: dados.email,
      assunto: dados.assunto,
      mensagem: dados.mensagem,
      consentimento: true,
      criadoEm: Timestamp.fromMillis(agora),
      lida: false,
      lidaEm: null,
      lidaPor: null,
    });
    return { ok: true, id: referencia.id } as const;
  });
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function paraOPainel(id: string, dados: Record<string, unknown>): MensagemDeContatoNoPainel {
  const criadoEm = dados.criadoEm instanceof Timestamp ? dados.criadoEm.toDate().toISOString() : null;
  const lidaEm = dados.lidaEm instanceof Timestamp ? dados.lidaEm.toDate().toISOString() : null;
  return {
    id,
    nome: texto(dados.nome),
    sobrenome: texto(dados.sobrenome),
    email: texto(dados.email),
    assunto: texto(dados.assunto),
    mensagem: texto(dados.mensagem),
    criadoEm,
    lida: dados.lida === true,
    lidaEm,
  };
}

// Lista do painel: as mais recentes primeiro (índice simples de criadoEm).
export async function listarMensagensDeContato(db: Firestore): Promise<MensagemDeContatoNoPainel[]> {
  const resultado = await db.collection(COLECAO_DE_MENSAGENS).orderBy("criadoEm", "desc").limit(LIMITE_DA_LISTA_DE_MENSAGENS).get();
  return resultado.docs.map((documento) => paraOPainel(documento.id, documento.data()));
}

export async function lerMensagemDeContato(db: Firestore, id: string): Promise<MensagemDeContatoNoPainel | null> {
  if (!ehIdDeDocumentoValido(id)) return null;
  const documento = await db.collection(COLECAO_DE_MENSAGENS).doc(id).get();
  return documento.exists ? paraOPainel(documento.id, documento.data() ?? {}) : null;
}

// "Marcar como lida": grava lida, a data e quem marcou, com uma linha no
// registro (só o nome do campo, sem o conteúdo da mensagem). Já lida: nada
// muda e nada é registrado.
export async function marcarMensagemComoLida(db: Firestore, id: string, autor: AutorDaAlteracao): Promise<{ ok: true; mudou: boolean } | { ok: false; mensagem: string }> {
  if (!ehIdDeDocumentoValido(id)) return { ok: false, mensagem: "Mensagem não encontrada." };
  const referencia = db.collection(COLECAO_DE_MENSAGENS).doc(id);
  return db.runTransaction(async (transacao) => {
    const documento = await transacao.get(referencia);
    if (!documento.exists) return { ok: false, mensagem: "Mensagem não encontrada. Ela pode ter sido apagada." } as const;
    if (documento.get("lida") === true) return { ok: true, mudou: false } as const;
    transacao.update(referencia, { lida: true, lidaEm: FieldValue.serverTimestamp(), lidaPor: autor.uid });
    registrarNaTransacao(db, transacao, autor, { colecao: COLECAO_DE_MENSAGENS, documentoId: id, acao: "editar", campos: ["lida"], resumo: "Mensagem de contato marcada como lida." });
    return { ok: true, mudou: true } as const;
  });
}
