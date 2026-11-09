// Importação dos campos extras dos profissionais (08/11/2026; nova decisão do
// responsável, que substitui as decisões 5 e 8 de 21/10/2026 sobre os campos
// fora do modelo). Do arquivo do site antigo (docs/dados-privados/
// profissionais.json), ligado pela origem.chave: endereço, site, outros
// perfis, e-mails extras, cidades e a apresentação (bio). Dos mini currículos
// do lote 1 (docs/dados-privados/minicurriculos/, quando existir): só a bio,
// conferida pelo nome.
//
// Regras: cada valor passa pela mesma validação do painel (o que não passa
// fica de fora e é contado); nada é resumido nem cortado (texto acima do
// limite fica de fora); NUNCA sobrescreve campo já preenchido nem campo que
// uma pessoa editou no painel (pelo registro de alterações). Idempotente:
// repetir não grava de novo. Cada documento alterado ganha a marca
// importacaoDeCamposExtras (execução, campos e valores gravados e se o campo
// existia antes), que o desfazer usa; o desfazer pula o campo que uma pessoa
// mudou depois. Não mexe em atualizadoEm, como os outros scripts de migração.
// Sem "server-only": Firestore por parâmetro, usado pelo script e pelos testes.
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { validarEmailsExtras, validarOutrosPerfis, validarSite, type PerfilExtra } from "../contatos.ts";
import { COLECAO_LOG, registrarNaTransacao } from "../log/alteracoes.ts";
import { LIMITES_DO_PROFISSIONAL } from "../profissionais.ts";
import { AUTOR_DA_MIGRACAO, type Modo } from "./execucao.ts";
import type { RegistroDeOrigem } from "./profissionais.ts";

export const COLECAO = "profissionais";
export const CAMPO_DA_MARCA = "importacaoDeCamposExtras";
export const CAMPOS_EXTRAS = ["endereco", "site", "outrosPerfis", "emailsExtras", "cidades", "bio"] as const;
export type CampoExtra = (typeof CAMPOS_EXTRAS)[number];
type Valor = string | string[] | PerfilExtra[];

export type DocumentoDoProfissional = { id: string; dados: Record<string, unknown> };

const texto = (valor: unknown): string => (typeof valor === "string" ? valor : "");
const vazio = (valor: unknown): boolean => valor === undefined || valor === null || valor === "" || (Array.isArray(valor) && valor.length === 0);

// Limpa só espaços e quebras (sem mudar palavras): \r\n vira \n, espaços
// repetidos viram um, cada linha sem espaços nas pontas e no máximo uma
// linha em branco entre parágrafos.
export function limparTexto(entrada: string): string {
  return entrada
    .replace(/\r\n?/g, "\n")
    .replace(/[\t  ]+/g, " ")
    .split("\n")
    .map((linha) => linha.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type Descartes = Partial<Record<CampoExtra, number>>;

// Valores do arquivo para o modelo, validados como no painel.
export function extrasDoRegistro(bruto: Record<string, unknown>): { valores: Partial<Record<CampoExtra, Valor>>; descartes: Descartes } {
  const valores: Partial<Record<CampoExtra, Valor>> = {};
  const descartes: Descartes = {};
  const descartar = (campo: CampoExtra, quantidade = 1) => (descartes[campo] = (descartes[campo] ?? 0) + quantidade);

  const endereco = limparTexto(texto(bruto.endereco)).replace(/\n+/g, ", ");
  if (endereco) {
    if (endereco.length <= LIMITES_DO_PROFISSIONAL.endereco) valores.endereco = endereco;
    else descartar("endereco");
  }
  const siteBruto = texto(bruto.site).trim();
  if (siteBruto) {
    const site = validarSite(siteBruto);
    if (site.ok && site.valor) valores.site = site.valor;
    else descartar("site");
  }
  const perfis: PerfilExtra[] = [];
  for (const item of Array.isArray(bruto.outrosPerfis) ? bruto.outrosPerfis : []) {
    const resultado = typeof item === "string" ? validarOutrosPerfis(item) : { ok: false as const };
    if (resultado.ok && resultado.valor.length === 1 && !perfis.some((p) => p.url === resultado.valor[0].url)) perfis.push(resultado.valor[0]);
    else descartar("outrosPerfis");
  }
  if (perfis.length > 0) valores.outrosPerfis = perfis.slice(0, 5);
  const emails: string[] = [];
  for (const item of Array.isArray(bruto.emailsExtras) ? bruto.emailsExtras : []) {
    const resultado = typeof item === "string" ? validarEmailsExtras(item) : { ok: false as const };
    if (resultado.ok && resultado.valor.length === 1 && !emails.includes(resultado.valor[0]) && resultado.valor[0] !== texto(bruto.email).trim().toLowerCase()) emails.push(resultado.valor[0]);
    else descartar("emailsExtras");
  }
  if (emails.length > 0) valores.emailsExtras = emails.slice(0, 3);
  const cidades = [...new Set((Array.isArray(bruto.cidades) ? bruto.cidades : []).filter((c): c is string => typeof c === "string").map((c) => limparTexto(c)).filter(Boolean))];
  if (cidades.length > 0) {
    if (cidades.length <= LIMITES_DO_PROFISSIONAL.cidades && cidades.every((c) => c.length <= LIMITES_DO_PROFISSIONAL.cidade)) valores.cidades = cidades;
    else descartar("cidades");
  }
  const bio = limparTexto(texto(bruto.bio));
  if (bio) {
    if (bio.length <= LIMITES_DO_PROFISSIONAL.bio) valores.bio = bio;
    else descartar("bio");
  }
  return { valores, descartes };
}

// Nome para comparar: sem acento, sem tratamento, minúsculas, um espaço.
export function nomeParaComparar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/^(dra?|ft|fta|prof|profa)\s+/, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type MiniCurriculo = { arquivo: string; texto: string };

export type Situacao = "aGravar" | "nadaAGravar" | "semDocumento" | "naLixeira";

export type ItemDoPlano = {
  // Posição no arquivo do site antigo, ou null (mini currículo).
  posicao: number | null;
  documentoId: string | null;
  fonte: "siteAntigo" | "miniCurriculo";
  situacao: Situacao;
  gravar: Partial<Record<CampoExtra, Valor>>;
  jaPreenchidos: CampoExtra[];
  editadosNoPainel: CampoExtra[];
  descartes: Descartes;
};

// Campos que uma pessoa editou no painel, por documento (registro de
// alterações sem a origem "migracao").
export function camposEditadosPorPessoa(registros: readonly Record<string, unknown>[]): Map<string, Set<string>> {
  const mapa = new Map<string, Set<string>>();
  for (const registro of registros) {
    if (registro.colecao !== COLECAO || registro.origem === "migracao") continue;
    const id = texto(registro.documentoId);
    const campos = Array.isArray(registro.campos) ? registro.campos.filter((c): c is string => typeof c === "string") : [];
    if (!id || campos.length === 0) continue;
    const conjunto = mapa.get(id) ?? new Set<string>();
    campos.forEach((campo) => conjunto.add(campo));
    mapa.set(id, conjunto);
  }
  return mapa;
}

function separar(documento: DocumentoDoProfissional, valores: Partial<Record<CampoExtra, Valor>>, editados: Set<string> | undefined) {
  const gravar: Partial<Record<CampoExtra, Valor>> = {};
  const jaPreenchidos: CampoExtra[] = [];
  const editadosNoPainel: CampoExtra[] = [];
  for (const campo of CAMPOS_EXTRAS) {
    const valor = valores[campo];
    if (valor === undefined) continue;
    if (!vazio(documento.dados[campo])) jaPreenchidos.push(campo);
    else if (editados?.has(campo)) editadosNoPainel.push(campo);
    else gravar[campo] = valor;
  }
  return { gravar, jaPreenchidos, editadosNoPainel };
}

// Plano puro: o que seria gravado, sem ler nem gravar nada.
export function planejarCamposExtras(
  registros: readonly RegistroDeOrigem[],
  documentos: readonly DocumentoDoProfissional[],
  editados: Map<string, Set<string>>,
  miniCurriculos: readonly MiniCurriculo[] = [],
): { plano: ItemDoPlano[]; semMiniCurriculo: string[]; miniCurriculosSemProfissional: string[] } {
  const origem = (d: DocumentoDoProfissional) => (d.dados.origem ?? {}) as { sistema?: unknown; chave?: unknown };
  const porChave = new Map(documentos.filter((d) => origem(d).sistema === "wix").map((d) => [texto(origem(d).chave), d]));
  const plano: ItemDoPlano[] = [];

  for (const registro of registros) {
    const { valores, descartes } = extrasDoRegistro(registro.bruto);
    if (Object.keys(valores).length === 0 && Object.keys(descartes).length === 0) continue;
    const documento = porChave.get(registro.chave);
    const base = { posicao: registro.posicao, fonte: "siteAntigo" as const, descartes };
    if (!documento) {
      plano.push({ ...base, documentoId: null, situacao: "semDocumento", gravar: {}, jaPreenchidos: [], editadosNoPainel: [] });
      continue;
    }
    const separado = separar(documento, valores, editados.get(documento.id));
    const situacao: Situacao = documento.dados.excluidoEm ? "naLixeira" : Object.keys(separado.gravar).length > 0 ? "aGravar" : "nadaAGravar";
    plano.push({ ...base, documentoId: documento.id, situacao, ...separado });
  }

  // Mini currículos do lote 1 (cadastro em lote): conferidos pelo nome.
  const doLote = documentos.filter((d) => origem(d).sistema === "cadastro-lote");
  const usados = new Set<string>();
  const semProfissional: string[] = [];
  for (const mini of miniCurriculos) {
    const alvo = nomeParaComparar(mini.arquivo.replace(/\.[a-z0-9]+$/i, ""));
    const achados = doLote.filter((d) => nomeParaComparar(texto(d.dados.nome)) === alvo);
    if (achados.length !== 1) {
      semProfissional.push(mini.arquivo);
      continue;
    }
    const documento = achados[0];
    usados.add(documento.id);
    const bio = limparTexto(mini.texto);
    const descartes: Descartes = bio.length > LIMITES_DO_PROFISSIONAL.bio ? { bio: 1 } : {};
    const separado = separar(documento, bio && !descartes.bio ? { bio } : {}, editados.get(documento.id));
    const situacao: Situacao = documento.dados.excluidoEm ? "naLixeira" : Object.keys(separado.gravar).length > 0 ? "aGravar" : "nadaAGravar";
    plano.push({ posicao: null, documentoId: documento.id, fonte: "miniCurriculo", situacao, ...separado, descartes });
  }
  const semMiniCurriculo = doLote.filter((d) => !usados.has(d.id) && !d.dados.excluidoEm).map((d) => d.id);
  return { plano, semMiniCurriculo, miniCurriculosSemProfissional: semProfissional };
}

export type RelatorioDosCamposExtras = {
  modo: Modo;
  execucao: string;
  plano: ItemDoPlano[];
  semMiniCurriculo: string[];
  miniCurriculosSemProfissional: string[];
  contagens: {
    documentos: number;
    aGravar: number;
    porCampo: Record<CampoExtra, number>;
    jaPreenchidos: Record<CampoExtra, number>;
    editadosNoPainel: Record<CampoExtra, number>;
    descartados: Record<CampoExtra, number>;
    semDocumento: number;
    naLixeira: number;
    gravados: number;
    pulados: number;
  };
};

const porCampo = (plano: ItemDoPlano[], ler: (item: ItemDoPlano) => readonly string[]) =>
  Object.fromEntries(CAMPOS_EXTRAS.map((campo) => [campo, plano.filter((item) => ler(item).includes(campo)).length])) as Record<CampoExtra, number>;

export async function importarCamposExtras(opcoes: {
  db: Firestore;
  registros: readonly RegistroDeOrigem[];
  miniCurriculos?: readonly MiniCurriculo[];
  modo: Modo;
  execucao: string;
}): Promise<RelatorioDosCamposExtras> {
  const { db, registros, modo, execucao } = opcoes;
  const documentos = (await db.collection(COLECAO).get()).docs.map((d) => ({ id: d.id, dados: d.data() }));
  const registrosDoLog = (await db.collection(COLECAO_LOG).where("colecao", "==", COLECAO).get()).docs.map((d) => d.data());
  const editados = camposEditadosPorPessoa(registrosDoLog);
  const { plano, semMiniCurriculo, miniCurriculosSemProfissional } = planejarCamposExtras(registros, documentos, editados, opcoes.miniCurriculos ?? []);
  let gravados = 0;
  let pulados = 0;

  if (modo === "executar") {
    // Um documento pode aparecer no site antigo e num mini currículo: junta.
    const porDocumento = new Map<string, Partial<Record<CampoExtra, Valor>>>();
    for (const item of plano.filter((i) => i.situacao === "aGravar" && i.documentoId)) {
      porDocumento.set(item.documentoId as string, { ...item.gravar, ...porDocumento.get(item.documentoId as string) });
    }
    for (const [documentoId, gravar] of porDocumento) {
      const referencia = db.collection(COLECAO).doc(documentoId);
      const gravou = await db.runTransaction(async (transacao) => {
        const atual = await transacao.get(referencia);
        const dados = atual.data() ?? {};
        if (!atual.exists || dados.excluidoEm) return false;
        // Conferido de novo dentro da transação: nunca sobrescreve.
        const campos = (Object.keys(gravar) as CampoExtra[]).filter((campo) => vazio(dados[campo]));
        if (campos.length === 0) return false;
        const mudancas: Record<string, unknown> = {};
        const marca: Record<string, { valor: Valor; existia: boolean }> = {};
        for (const campo of campos) {
          mudancas[campo] = gravar[campo];
          marca[campo] = { valor: gravar[campo] as Valor, existia: dados[campo] !== undefined };
        }
        const anterior = (dados[CAMPO_DA_MARCA] ?? {}) as { campos?: Record<string, unknown> };
        transacao.update(referencia, { ...mudancas, [CAMPO_DA_MARCA]: { execucao, campos: { ...(anterior.campos ?? {}), ...marca } } });
        registrarNaTransacao(db, transacao, AUTOR_DA_MIGRACAO, {
          colecao: COLECAO,
          documentoId,
          acao: "editar",
          campos,
          resumo: "Campos do site antigo e mini currículo importados.",
          origem: "migracao",
          execucao,
        });
        return true;
      });
      if (gravou) gravados++;
      else pulados++;
    }
  }

  const somarDescartes = Object.fromEntries(CAMPOS_EXTRAS.map((campo) => [campo, plano.reduce((soma, item) => soma + (item.descartes[campo] ?? 0), 0)])) as Record<CampoExtra, number>;
  return {
    modo,
    execucao,
    plano,
    semMiniCurriculo,
    miniCurriculosSemProfissional,
    contagens: {
      documentos: new Set(plano.filter((i) => i.situacao === "aGravar").map((i) => i.documentoId)).size,
      aGravar: plano.filter((i) => i.situacao === "aGravar").length,
      porCampo: porCampo(plano.filter((i) => i.situacao === "aGravar"), (item) => Object.keys(item.gravar)),
      jaPreenchidos: porCampo(plano, (item) => item.jaPreenchidos),
      editadosNoPainel: porCampo(plano, (item) => item.editadosNoPainel),
      descartados: somarDescartes,
      semDocumento: plano.filter((i) => i.situacao === "semDocumento").length,
      naLixeira: plano.filter((i) => i.situacao === "naLixeira").length,
      gravados,
      pulados,
    },
  };
}

export type RelatorioDoDesfazer = { modo: Modo; execucaoDesfeita: string; encontrados: number; desfeitos: number; pulados: { id: string; motivo: string }[] };

// Desfaz uma execução: cada campo gravado volta ao que era (ausente ou
// vazio), só se ainda tiver o valor importado (senão, uma pessoa mudou).
export async function desfazerCamposExtras(opcoes: { db: Firestore; execucaoAlvo: string; execucao: string; modo: Modo }): Promise<RelatorioDoDesfazer> {
  const { db, execucaoAlvo, execucao, modo } = opcoes;
  const documentos = (await db.collection(COLECAO).where(`${CAMPO_DA_MARCA}.execucao`, "==", execucaoAlvo).get()).docs;
  const pulados: { id: string; motivo: string }[] = [];
  let desfeitos = 0;
  for (const documento of documentos) {
    const desfeito = await db.runTransaction(async (transacao) => {
      const atual = await transacao.get(documento.ref);
      if (!atual.exists || atual.get(`${CAMPO_DA_MARCA}.execucao`) !== execucaoAlvo) return false;
      const marca = (atual.get(`${CAMPO_DA_MARCA}.campos`) ?? {}) as Record<string, { valor: unknown; existia: boolean }>;
      const mudancas: Record<string, unknown> = {};
      const campos: string[] = [];
      for (const [campo, { valor, existia }] of Object.entries(marca)) {
        if (JSON.stringify(atual.get(campo)) !== JSON.stringify(valor)) continue;
        mudancas[campo] = existia ? (Array.isArray(valor) ? [] : "") : FieldValue.delete();
        campos.push(campo);
      }
      if (campos.length === 0) return false;
      if (modo === "executar") {
        transacao.update(documento.ref, { ...mudancas, [CAMPO_DA_MARCA]: FieldValue.delete() });
        registrarNaTransacao(db, transacao, AUTOR_DA_MIGRACAO, {
          colecao: COLECAO,
          documentoId: documento.id,
          acao: "editar",
          campos,
          resumo: `Importação de campos extras desfeita (execução ${execucaoAlvo}).`,
          origem: "migracao",
          execucao,
        });
      }
      return true;
    });
    if (desfeito) desfeitos++;
    else pulados.push({ id: documento.id, motivo: "alterado por uma pessoa depois da importação" });
  }
  return { modo, execucaoDesfeita: execucaoAlvo, encontrados: documentos.length, desfeitos, pulados };
}

// Relatório para tmp-migracao/: posições, ids e contagens, sem nomes nem valores.
export function relatorioDosCamposExtrasEmMarkdown(relatorio: RelatorioDosCamposExtras, projeto: string): string {
  const c = relatorio.contagens;
  const linha = (titulo: string, contagem: Record<CampoExtra, number>) => `| ${titulo} | ${CAMPOS_EXTRAS.map((campo) => contagem[campo]).join(" | ")} |`;
  return [
    `# Importação dos campos extras dos profissionais: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"} ${relatorio.execucao}`,
    "",
    `Projeto: ${projeto}. Documentos a alterar: ${c.documentos}; sem documento: ${c.semDocumento}; na lixeira: ${c.naLixeira}.`,
    relatorio.modo === "executar" ? `Gravados: ${c.gravados}; pulados na gravação: ${c.pulados}.` : "Nada foi gravado.",
    "",
    `| Situação | ${CAMPOS_EXTRAS.join(" | ")} |`,
    `|---|${CAMPOS_EXTRAS.map(() => "---").join("|")}|`,
    linha("a gravar", c.porCampo),
    linha("já preenchido (pulado)", c.jaPreenchidos),
    linha("editado no painel (pulado)", c.editadosNoPainel),
    linha("fora da validação ou do limite", c.descartados),
    "",
    `Lote 1 sem mini currículo (ids): ${relatorio.semMiniCurriculo.join(", ") || "nenhum"}.`,
    `Mini currículos sem profissional conferido pelo nome: ${relatorio.miniCurriculosSemProfissional.length}.`,
    "",
    "| Fonte | Posição | Documento | Situação | Campos a gravar |",
    "|---|---|---|---|---|",
    ...relatorio.plano.map((item) => `| ${item.fonte === "siteAntigo" ? "site antigo" : "mini currículo"} | ${item.posicao ?? ""} | ${item.documentoId ?? ""} | ${item.situacao} | ${Object.keys(item.gravar).join(", ")} |`),
    "",
  ].join("\n");
}
