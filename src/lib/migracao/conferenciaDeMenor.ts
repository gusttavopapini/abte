// Conferência de fotos de menores nas imagens importadas do site antigo
// (etapa 6). A importação grava sempre conferenciaDeMenor = "pendente"; só
// uma pessoa com papel no painel marca "conferido" ou "naoSeAplica". Enquanto
// o painel não tem tela para isso, a marcação é por script
// (scripts/marcar-conferencia-menor.mts), a partir de uma lista local de ids.
// Atualiza só esse campo, só em documentos que já o têm, com uma linha
// "editar" no registro de alterações em nome da pessoa (sem origem: é ação de
// pessoa, não da migração).
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { ehPapelDoPainel } from "../auth/papeis.ts";
import type { ConferenciaDeMenor } from "../dados/tipos.ts";
import { registrarNoLote, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { COLECAO_MIDIAS } from "../midia/biblioteca.ts";
import { ehIdDeDocumentoValido } from "../validacao.ts";
import type { Modo } from "./execucao.ts";

export type Marcacao = Exclude<ConferenciaDeMenor, "pendente">;

const MARCACOES: Marcacao[] = ["conferido", "naoSeAplica"];
const LIMITE_DA_LISTA = 1000;

const RESUMOS: Record<Marcacao, string> = {
  conferido: "Conferência de menores: conferido.",
  naoSeAplica: "Conferência de menores: não se aplica.",
};

// Lista local: { "conferido": [ids de midias], "naoSeAplica": [ids] }.
// Recusa chave desconhecida, id inválido, id repetido (inclusive nas duas
// listas) e lista vazia.
export function validarListaDeConferencia(dados: unknown): { ok: true; itens: { midiaId: string; valor: Marcacao }[] } | { ok: false; erros: string[] } {
  if (typeof dados !== "object" || dados === null || Array.isArray(dados)) return { ok: false, erros: ["O arquivo não é um objeto JSON."] };
  const erros: string[] = [];
  const itens: { midiaId: string; valor: Marcacao }[] = [];
  const vistos = new Set<string>();
  for (const [chave, valor] of Object.entries(dados)) {
    if (!(MARCACOES as string[]).includes(chave)) {
      erros.push(`Chave desconhecida: ${chave} (use conferido ou naoSeAplica).`);
      continue;
    }
    if (!Array.isArray(valor)) {
      erros.push(`${chave} precisa ser uma lista de ids.`);
      continue;
    }
    valor.forEach((id: unknown, i: number) => {
      if (!ehIdDeDocumentoValido(id)) erros.push(`${chave}[${i}]: id inválido.`);
      else if (vistos.has(id)) erros.push(`${chave}[${i}]: id repetido.`);
      else {
        vistos.add(id);
        itens.push({ midiaId: id, valor: chave as Marcacao });
      }
    });
  }
  if (erros.length === 0 && itens.length === 0) erros.push("A lista está vazia.");
  if (itens.length > LIMITE_DA_LISTA) erros.push(`No máximo ${LIMITE_DA_LISTA} ids por vez.`);
  return erros.length > 0 ? { ok: false, erros } : { ok: true, itens };
}

// Quem conferiu: um usuário do Authentication com papel no painel, ativo. O
// registro guarda o uid, o nome de exibição e o papel, nunca o e-mail.
export async function autorDaConferencia(auth: Auth, uid: string): Promise<{ ok: true; autor: AutorDaAlteracao } | { ok: false; mensagem: string }> {
  let usuario;
  try {
    usuario = await auth.getUser(uid);
  } catch {
    return { ok: false, mensagem: "Usuário não encontrado no Authentication." };
  }
  if (usuario.disabled) return { ok: false, mensagem: "Usuário desativado." };
  const papel = usuario.customClaims?.papel;
  if (!ehPapelDoPainel(papel)) return { ok: false, mensagem: "O usuário não tem papel no painel (administrador ou editor)." };
  return { ok: true, autor: { uid, nome: usuario.displayName?.trim() || "Sem nome", papel } };
}

export async function marcarConferencia(opcoes: {
  db: Firestore;
  itens: { midiaId: string; valor: Marcacao }[];
  autor: AutorDaAlteracao | null;
  modo: Modo;
  execucao: string;
}) {
  const { db, itens, autor, modo, execucao } = opcoes;
  if (modo === "executar" && !autor) throw new Error("Gravar exige o autor da conferência.");
  const iniciadoEm = new Date().toISOString();
  const marcadas: { midiaId: string; de: string; para: Marcacao }[] = [];
  const puladas: { midiaId: string; motivo: string }[] = [];

  for (const { midiaId, valor } of itens) {
    const referencia = db.collection(COLECAO_MIDIAS).doc(midiaId);
    const documento = await referencia.get();
    if (!documento.exists) {
      puladas.push({ midiaId, motivo: "não encontrada" });
      continue;
    }
    const atual = documento.get("conferenciaDeMenor");
    if (atual === undefined) {
      puladas.push({ midiaId, motivo: "sem o campo conferenciaDeMenor (não é imagem importada)" });
      continue;
    }
    if (atual === valor) {
      puladas.push({ midiaId, motivo: "já estava assim" });
      continue;
    }
    if (modo === "executar" && autor) {
      const lote = db.batch();
      lote.update(referencia, { conferenciaDeMenor: valor });
      registrarNoLote(db, lote, autor, { colecao: COLECAO_MIDIAS, documentoId: midiaId, acao: "editar", campos: ["conferenciaDeMenor"], resumo: RESUMOS[valor] });
      await lote.commit();
    }
    marcadas.push({ midiaId, de: String(atual), para: valor });
  }

  return {
    script: "marcar-conferencia-menor",
    execucao,
    modo,
    papelDoAutor: autor?.papel ?? null,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    contagens: { naLista: itens.length, marcadas: marcadas.length, puladas: puladas.length },
    marcadas,
    puladas,
  };
}
