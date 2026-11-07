// Gravação dos profissionais no Firestore, com o registro de alterações no
// mesmo lote. Sem sessão e sem "server-only", como src/lib/loja/contas.ts:
// recebe o Firestore por parâmetro e é usada pelas ações de servidor
// (acoes-profissionais.ts, que conferem sessão e papel antes) e pelos testes
// no emulador.
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { camposAlterados, registrarNoLote, type Alteracao, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { escolhaDeMidiaValida } from "../midia/biblioteca.ts";
import type { DadosDoProfissional } from "../profissionais.ts";

export const COLECAO_PROFISSIONAIS = "profissionais";

export const MENSAGEM_FOTO_INDISPONIVEL = "A foto escolhida não está mais na biblioteca (foi para a lixeira ou excluída). Escolha outra ou remova a foto.";

type Falha = { ok: false; mensagem: string; campo?: "fotoMidiaId" };

// Só para scripts (cadastro em lote, 04/11/2026): campos extras gravados junto
// com os do formulário (ex.: origem) e a marca do registro de alterações
// (origem "migracao" e a execução). O painel não usa nenhum dos dois.
export type OpcoesDaGravacaoDoProfissional = {
  extras?: Record<string, unknown>;
  registro?: Pick<Alteracao, "origem" | "execucao"> & { resumo?: string };
};

// Cria (id null) ou atualiza um profissional. Uma foto nova precisa existir na
// biblioteca e estar fora da lixeira; a foto que já estava gravada pode ficar
// mesmo se foi para a lixeira (volta a aparecer se a imagem for restaurada).
export async function gravarProfissional(
  db: Firestore,
  id: string | null,
  dados: DadosDoProfissional,
  autor: AutorDaAlteracao,
  opcoes: OpcoesDaGravacaoDoProfissional = {},
): Promise<{ ok: true; id: string } | Falha> {
  const extras = opcoes.extras ?? {};
  const marca = opcoes.registro ? { origem: opcoes.registro.origem, execucao: opcoes.registro.execucao } : {};
  const colecao = db.collection(COLECAO_PROFISSIONAIS);
  const referencia = id ? colecao.doc(id) : colecao.doc();
  const atual = id ? await referencia.get() : null;
  if (atual && !atual.exists) return { ok: false, mensagem: "Profissional não encontrado." };

  const fotoAnterior = atual?.get("fotoMidiaId") ?? null;
  if (!(await escolhaDeMidiaValida(db, dados.fotoMidiaId, fotoAnterior))) {
    return { ok: false, mensagem: MENSAGEM_FOTO_INDISPONIVEL, campo: "fotoMidiaId" };
  }

  const agora = new Date();
  const lote = db.batch();
  if (atual) {
    // Documento de antes do campo telefones (06/11/2026): a lista vazia não é
    // gravada, para a edição não registrar uma mudança que não houve.
    const { telefones, ...semTelefones } = dados;
    const gravar = telefones.length === 0 && atual.get("telefones") === undefined ? semTelefones : dados;
    lote.update(referencia, { ...gravar, ...extras, atualizadoEm: agora });
    registrarNoLote(db, lote, autor, {
      colecao: COLECAO_PROFISSIONAIS,
      documentoId: referencia.id,
      acao: "editar",
      campos: camposAlterados(atual.data() ?? {}, { ...gravar, ...extras }),
      resumo: opcoes.registro?.resumo ?? "Profissional alterado.",
      ...marca,
    });
  } else {
    lote.create(referencia, { ...dados, ...extras, criadoEm: agora, atualizadoEm: agora, excluidoEm: null });
    registrarNoLote(db, lote, autor, {
      colecao: COLECAO_PROFISSIONAIS,
      documentoId: referencia.id,
      acao: "criar",
      campos: [...Object.keys(dados), ...Object.keys(extras)],
      resumo: opcoes.registro?.resumo ?? "Profissional cadastrado.",
      ...marca,
    });
  }
  await lote.commit();
  return { ok: true, id: referencia.id };
}

// Muda o campo excluidoEm: preenchido manda para os excluídos (some do site),
// vazio restaura. Nada é apagado de vez pelo painel.
export async function marcarExclusaoDoProfissional(
  db: Firestore,
  id: string,
  excluir: boolean,
  autor: AutorDaAlteracao,
): Promise<{ ok: true; nome: string } | Falha> {
  const referencia = db.collection(COLECAO_PROFISSIONAIS).doc(id);
  const atual = await referencia.get();
  if (!atual.exists) return { ok: false, mensagem: "Profissional não encontrado." };
  const lote = db.batch();
  lote.update(referencia, { excluidoEm: excluir ? FieldValue.serverTimestamp() : null, atualizadoEm: new Date() });
  registrarNoLote(db, lote, autor, {
    colecao: COLECAO_PROFISSIONAIS,
    documentoId: id,
    acao: excluir ? "excluir" : "restaurar",
    campos: ["excluidoEm"],
    resumo: excluir ? "Profissional movido para os excluídos." : "Profissional restaurado.",
  });
  await lote.commit();
  return { ok: true, nome: String(atual.get("nome") ?? "") };
}
