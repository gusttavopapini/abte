// Gravação dos profissionais no Firestore, com o registro de alterações no
// mesmo lote. Sem sessão e sem "server-only", como src/lib/loja/contas.ts:
// recebe o Firestore por parâmetro e é usada pelas ações de servidor
// (acoes-profissionais.ts, que conferem sessão e papel antes) e pelos testes
// no emulador.
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { camposAlterados, registrarNoLote, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { midiaPodeSerEscolhida } from "../midia/biblioteca.ts";
import type { DadosDoProfissional } from "../profissionais.ts";

export const COLECAO_PROFISSIONAIS = "profissionais";

export const MENSAGEM_FOTO_INDISPONIVEL = "A foto escolhida não está mais na biblioteca (foi para a lixeira ou excluída). Escolha outra ou remova a foto.";

type Falha = { ok: false; mensagem: string; campo?: "fotoMidiaId" };

// Cria (id null) ou atualiza um profissional. Uma foto nova precisa existir na
// biblioteca e estar fora da lixeira; a foto que já estava gravada pode ficar
// mesmo se foi para a lixeira (volta a aparecer se a imagem for restaurada).
export async function gravarProfissional(
  db: Firestore,
  id: string | null,
  dados: DadosDoProfissional,
  autor: AutorDaAlteracao,
): Promise<{ ok: true; id: string } | Falha> {
  const colecao = db.collection(COLECAO_PROFISSIONAIS);
  const referencia = id ? colecao.doc(id) : colecao.doc();
  const atual = id ? await referencia.get() : null;
  if (atual && !atual.exists) return { ok: false, mensagem: "Profissional não encontrado." };

  const fotoAnterior = atual?.get("fotoMidiaId") ?? null;
  if (dados.fotoMidiaId && dados.fotoMidiaId !== fotoAnterior && !(await midiaPodeSerEscolhida(db, dados.fotoMidiaId))) {
    return { ok: false, mensagem: MENSAGEM_FOTO_INDISPONIVEL, campo: "fotoMidiaId" };
  }

  const agora = new Date();
  const lote = db.batch();
  if (atual) {
    lote.update(referencia, { ...dados, atualizadoEm: agora });
    registrarNoLote(db, lote, autor, {
      colecao: COLECAO_PROFISSIONAIS,
      documentoId: referencia.id,
      acao: "editar",
      campos: camposAlterados(atual.data() ?? {}, dados),
      resumo: "Profissional alterado.",
    });
  } else {
    lote.create(referencia, { ...dados, criadoEm: agora, atualizadoEm: agora, excluidoEm: null });
    registrarNoLote(db, lote, autor, {
      colecao: COLECAO_PROFISSIONAIS,
      documentoId: referencia.id,
      acao: "criar",
      campos: Object.keys(dados),
      resumo: "Profissional cadastrado.",
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
