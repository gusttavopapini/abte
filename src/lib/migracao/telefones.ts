// Importação dos telefones dos profissionais (06/11/2026). Duas regras, só
// para quem ainda não tem telefone cadastrado:
// 1. Telefones do site antigo (campo "telefones" de
//    docs/dados-privados/profissionais.json), ligados ao profissional pela
//    origem.chave. Cada número passa pela mesma validação do painel
//    (validarTelefone); número inválido ou igual ao WhatsApp de hoje fica de
//    fora.
// 2. Número fixo brasileiro gravado no campo WhatsApp (não abre conversa no
//    WhatsApp): passa para Telefones e o WhatsApp fica vazio.
// Nada é inventado: links encurtados do WhatsApp (sem número) não entram.
// Nunca sobrescreve: profissional que já tem telefone é pulado. Idempotente:
// repetir não grava de novo. Cada documento alterado ganha a marca
// importacaoDeTelefones (execução, o que foi gravado e o WhatsApp de antes),
// que o desfazer usa; o desfazer pula o documento alterado depois por uma
// pessoa. Não mexe em atualizadoEm, como os outros scripts de migração.
// Sem "server-only": Firestore por parâmetro, usado pelo script e pelos testes.
import { FieldValue, type Firestore, type DocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import type { CodigoDePais } from "../../config/profissionais.ts";
import { ehFixoBrasileiro, validarTelefone } from "../contatos.ts";
import { registrarNaTransacao } from "../log/alteracoes.ts";
import { AUTOR_DA_MIGRACAO, type Modo } from "./execucao.ts";
import type { RegistroDeOrigem } from "./profissionais.ts";

export const COLECAO = "profissionais";
export const CAMPO_DA_MARCA = "importacaoDeTelefones";

export type DocumentoDoProfissional = { id: string; dados: Record<string, unknown> };

export type Situacao = "aGravar" | "jaTemTelefone" | "semNumeroValido" | "semDocumento" | "naLixeira";

export type ItemDoPlano = {
  // Posição no arquivo do site antigo (regra 1) ou null (regra 2).
  posicao: number | null;
  documentoId: string | null;
  regra: "siteAntigo" | "fixoNoWhatsapp";
  situacao: Situacao;
  telefones: string[];
  // Regra 2: o WhatsApp de hoje vira o telefone e o campo fica vazio.
  esvaziarWhatsapp: boolean;
  // Quantos números do site antigo ficaram de fora (inválidos ou iguais ao WhatsApp).
  deFora: number;
};

const lista = (valor: unknown): string[] => (Array.isArray(valor) ? valor.filter((item): item is string => typeof item === "string") : []);
const texto = (valor: unknown): string => (typeof valor === "string" ? valor : "");

// Plano puro: o que cada regra faria, sem ler nem gravar nada.
export function planejarTelefones(registros: readonly RegistroDeOrigem[], documentos: readonly DocumentoDoProfissional[]): ItemDoPlano[] {
  const porChave = new Map(documentos.filter((d) => (d.dados.origem as { sistema?: unknown } | undefined)?.sistema === "wix").map((d) => [texto((d.dados.origem as { chave?: unknown }).chave), d]));
  const plano: ItemDoPlano[] = [];
  const usados = new Set<string>();

  for (const registro of registros) {
    const brutos = lista(registro.bruto.telefones);
    if (brutos.length === 0) continue;
    const documento = porChave.get(registro.chave);
    const base = { posicao: registro.posicao, regra: "siteAntigo" as const, esvaziarWhatsapp: false };
    if (!documento) {
      plano.push({ ...base, documentoId: null, situacao: "semDocumento", telefones: [], deFora: brutos.length });
      continue;
    }
    usados.add(documento.id);
    const pais = (texto(documento.dados.pais) || "BR") as CodigoDePais;
    const whatsapp = texto(documento.dados.whatsapp);
    const telefones: string[] = [];
    for (const bruto of brutos) {
      const resultado = validarTelefone(bruto, pais);
      if (resultado.ok && resultado.valor && resultado.valor !== whatsapp && !telefones.includes(resultado.valor)) telefones.push(resultado.valor);
    }
    const situacao: Situacao = documento.dados.excluidoEm ? "naLixeira" : lista(documento.dados.telefones).length > 0 ? "jaTemTelefone" : telefones.length === 0 ? "semNumeroValido" : "aGravar";
    plano.push({ ...base, documentoId: documento.id, situacao, telefones, deFora: brutos.length - telefones.length });
  }

  for (const documento of documentos) {
    const whatsapp = texto(documento.dados.whatsapp);
    if (usados.has(documento.id) || !ehFixoBrasileiro(whatsapp)) continue;
    const situacao: Situacao = documento.dados.excluidoEm ? "naLixeira" : lista(documento.dados.telefones).length > 0 ? "jaTemTelefone" : "aGravar";
    plano.push({ posicao: null, documentoId: documento.id, regra: "fixoNoWhatsapp", situacao, telefones: [whatsapp], esvaziarWhatsapp: true, deFora: 0 });
  }
  return plano;
}

export type RelatorioDosTelefones = {
  modo: Modo;
  execucao: string;
  plano: ItemDoPlano[];
  contagens: { aGravar: number; jaTemTelefone: number; semNumeroValido: number; semDocumento: number; naLixeira: number; gravados: number; pulados: number };
};

export async function importarTelefones(opcoes: { db: Firestore; registros: readonly RegistroDeOrigem[]; modo: Modo; execucao: string }): Promise<RelatorioDosTelefones> {
  const { db, registros, modo, execucao } = opcoes;
  const documentos = (await db.collection(COLECAO).get()).docs.map((d) => ({ id: d.id, dados: d.data() }));
  const plano = planejarTelefones(registros, documentos);
  const contar = (situacao: Situacao) => plano.filter((item) => item.situacao === situacao).length;
  let gravados = 0;
  let pulados = 0;

  if (modo === "executar") {
    for (const item of plano.filter((i) => i.situacao === "aGravar" && i.documentoId)) {
      const referencia = db.collection(COLECAO).doc(item.documentoId as string);
      const gravou = await db.runTransaction(async (transacao) => {
        const atual = await transacao.get(referencia);
        const dados = atual.data() ?? {};
        // Conferido de novo dentro da transação: nunca sobrescreve.
        if (!atual.exists || dados.excluidoEm || lista(dados.telefones).length > 0) return false;
        if (item.esvaziarWhatsapp && texto(dados.whatsapp) !== item.telefones[0]) return false;
        const whatsappAnterior = item.esvaziarWhatsapp ? texto(dados.whatsapp) : null;
        transacao.update(referencia, {
          telefones: item.telefones,
          ...(item.esvaziarWhatsapp ? { whatsapp: "" } : {}),
          [CAMPO_DA_MARCA]: { execucao, telefones: item.telefones, whatsappAnterior },
        });
        registrarNaTransacao(db, transacao, AUTOR_DA_MIGRACAO, {
          colecao: COLECAO,
          documentoId: referencia.id,
          acao: "editar",
          campos: item.esvaziarWhatsapp ? ["telefones", "whatsapp"] : ["telefones"],
          resumo: item.esvaziarWhatsapp ? "Telefone fixo passou do campo WhatsApp para Telefones." : "Telefones importados do site antigo.",
          origem: "migracao",
          execucao,
        });
        return true;
      });
      if (gravou) gravados++;
      else pulados++;
    }
  }

  return {
    modo,
    execucao,
    plano,
    contagens: { aGravar: contar("aGravar"), jaTemTelefone: contar("jaTemTelefone"), semNumeroValido: contar("semNumeroValido"), semDocumento: contar("semDocumento"), naLixeira: contar("naLixeira"), gravados, pulados },
  };
}

export type RelatorioDoDesfazer = { modo: Modo; execucaoDesfeita: string; encontrados: number; desfeitos: number; pulados: { id: string; motivo: string }[] };

// Desfaz uma execução: tira os telefones gravados e devolve o WhatsApp de
// antes. Pula o documento em que uma pessoa mudou os telefones ou o WhatsApp
// depois da importação.
export async function desfazerTelefones(opcoes: { db: Firestore; execucaoAlvo: string; execucao: string; modo: Modo }): Promise<RelatorioDoDesfazer> {
  const { db, execucaoAlvo, execucao, modo } = opcoes;
  const documentos = (await db.collection(COLECAO).where(`${CAMPO_DA_MARCA}.execucao`, "==", execucaoAlvo).get()).docs;
  const pulados: { id: string; motivo: string }[] = [];
  let desfeitos = 0;
  for (const documento of documentos) {
    // A consulta apenas seleciona candidatos. Confira novamente na transação:
    // uma edição pode acontecer depois da consulta, antes de desfazer.
    const desfazer = (atual: DocumentSnapshot, transacao?: Transaction): boolean => {
      if (!atual.exists || atual.get(`${CAMPO_DA_MARCA}.execucao`) !== execucaoAlvo) return false;
      const marca = atual.get(CAMPO_DA_MARCA) as { telefones?: unknown; whatsappAnterior?: unknown };
      const telefonesIguais = JSON.stringify(lista(atual.get("telefones"))) === JSON.stringify(lista(marca.telefones));
      const moveu = typeof marca.whatsappAnterior === "string" && marca.whatsappAnterior !== "";
      if (!telefonesIguais || (moveu && texto(atual.get("whatsapp")) !== "")) return false;
      if (transacao) {
        transacao.update(atual.ref, { telefones: FieldValue.delete(), [CAMPO_DA_MARCA]: FieldValue.delete(), ...(moveu ? { whatsapp: marca.whatsappAnterior } : {}) });
        registrarNaTransacao(db, transacao, AUTOR_DA_MIGRACAO, {
          colecao: COLECAO,
          documentoId: atual.id,
          acao: "editar",
          campos: moveu ? ["telefones", "whatsapp"] : ["telefones"],
          resumo: `Importação de telefones desfeita (execução ${execucaoAlvo}).`,
          origem: "migracao",
          execucao,
        });
      }
      return true;
    };
    const desfeito = modo === "executar"
      ? await db.runTransaction(async (transacao) => desfazer(await transacao.get(documento.ref), transacao))
      : await desfazer(documento);
    if (desfeito) desfeitos++;
    else pulados.push({ id: documento.id, motivo: "alterado por uma pessoa depois da importação" });
  }
  return { modo, execucaoDesfeita: execucaoAlvo, encontrados: documentos.length, desfeitos, pulados };
}

// Relatório para tmp-migracao/: posições e ids, sem nomes nem números.
export function relatorioDosTelefonesEmMarkdown(relatorio: RelatorioDosTelefones, projeto: string): string {
  const c = relatorio.contagens;
  const nomeDaSituacao: Record<Situacao, string> = { aGravar: "a gravar", jaTemTelefone: "já tem telefone (pulado)", semNumeroValido: "nenhum número válido", semDocumento: "sem documento", naLixeira: "na lixeira (pulado)" };
  return [
    `# Importação de telefones: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"} ${relatorio.execucao}`,
    "",
    `Projeto: ${projeto}. A gravar: ${c.aGravar}; já com telefone: ${c.jaTemTelefone}; sem número válido: ${c.semNumeroValido}; sem documento: ${c.semDocumento}; na lixeira: ${c.naLixeira}.`,
    relatorio.modo === "executar" ? `Gravados: ${c.gravados}; pulados na gravação: ${c.pulados}.` : "Nada foi gravado.",
    "",
    "| Regra | Posição | Documento | Situação | Telefones | Fora |",
    "|---|---|---|---|---|---|",
    ...relatorio.plano.map((item) => `| ${item.regra === "siteAntigo" ? "site antigo" : "fixo no WhatsApp"} | ${item.posicao ?? ""} | ${item.documentoId ?? ""} | ${nomeDaSituacao[item.situacao]} | ${item.telefones.length} | ${item.deFora} |`),
    "",
  ].join("\n");
}
