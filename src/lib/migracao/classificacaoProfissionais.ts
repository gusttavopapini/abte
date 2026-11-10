// Auditoria da classificação dos profissionais (10/11/2026). Compara o tipo
// gravado com três fontes: o conselho do registro (CRM, Crefito, CRP), a
// página do site antigo de onde o registro veio (profissionais.json, campo
// fonte) e a planilha do lote 1 (lote-1.json). Sem "server-only": usada pelo
// script scripts/auditar-classificacao-profissionais.mts e pelos testes.
//
// Regra da correção: só quando pelo menos duas fontes apontam o mesmo tipo e
// nenhuma aponta outro. Conflito, fonte única que discorda, tipo fora da lista
// e casos sem fonte ficam como estão e vão para a lista de dúvidas.
import type { Firestore } from "firebase-admin/firestore";
import { TAGS_DE_PROFISSIONAIS, type TipoDeProfissional } from "../../config/profissionais.ts";
import { gravarProfissional } from "../gravacao/profissionais.ts";
import type { AutorDaAlteracao } from "../log/alteracoes.ts";
import type { DadosDoProfissional } from "../profissionais.ts";
import { nomeParaOrdenar } from "../ordemDosProfissionais.ts";

export const AUTOR_DO_AJUSTE: AutorDaAlteracao = { uid: "ajuste-classificacao", nome: "Ajuste de classificação (script)", papel: "sistema" };

const TIPOS = TAGS_DE_PROFISSIONAIS as readonly string[];

// Tipo pelo conselho escrito no registro; sem conselho reconhecível, null.
export function tipoPeloConselho(registro: string | null | undefined): TipoDeProfissional | null {
  const texto = (registro ?? "").toUpperCase();
  // "CREF" sozinho é o conselho de educação física: não conta.
  if (/\bCRM\b/.test(texto)) return "Médicos";
  if (/CREFITO|CRFITO/.test(texto)) return "Fisioterapeutas";
  if (/\bCRP\b/.test(texto)) return "Psicólogos";
  return null;
}

const PAGINAS: Record<string, TipoDeProfissional> = {
  fisioterapeutas: "Fisioterapeutas",
  medicos: "Médicos",
  ortesistas: "Ortesistas",
  psicologos: "Psicólogos",
  outros: "Outros",
};

// Tipo pela página do site antigo (último trecho do endereço).
export function tipoPelaPagina(fonte: string | null | undefined): TipoDeProfissional | null {
  const caminho = (fonte ?? "").replace(/[?#].*$/, "").replace(/\/+$/, "");
  return PAGINAS[caminho.slice(caminho.lastIndexOf("/") + 1).toLowerCase()] ?? null;
}

// Tipo pela planilha do lote 1 (já escrito como no modelo).
export function tipoPelaPlanilha(tipo: string | null | undefined): TipoDeProfissional | null {
  return tipo && TIPOS.includes(tipo) ? (tipo as TipoDeProfissional) : null;
}

export type FontesDoTipo = { conselho: TipoDeProfissional | null; pagina: TipoDeProfissional | null; planilha: TipoDeProfissional | null };

export type DecisaoDoTipo =
  | { decisao: "confere" }
  | { decisao: "corrigir"; para: TipoDeProfissional }
  | { decisao: "duvida"; motivo: string };

// Decisão para um profissional, só pelo tipo gravado e pelas fontes.
export function decidirTipo(tipoAtual: string, fontes: FontesDoTipo): DecisaoDoTipo {
  const valores = [fontes.conselho, fontes.pagina, fontes.planilha].filter((valor): valor is TipoDeProfissional => valor !== null);
  const distintos = [...new Set(valores)];
  const foraDaLista = !TIPOS.includes(tipoAtual);
  if (valores.length === 0) {
    return foraDaLista
      ? { decisao: "duvida", motivo: "Tipo vazio ou fora da lista e nenhuma fonte (sem conselho no registro, sem página de origem e fora da planilha)." }
      : { decisao: "duvida", motivo: "Nenhuma fonte para conferir o tipo (sem conselho no registro, sem página de origem e fora da planilha)." };
  }
  if (distintos.length > 1) return { decisao: "duvida", motivo: `Fontes em conflito: ${descreverFontes(fontes)}.` };
  const unico = distintos[0];
  if (unico === tipoAtual) return { decisao: "confere" };
  if (valores.length >= 2) return { decisao: "corrigir", para: unico };
  return { decisao: "duvida", motivo: `Só uma fonte (${descreverFontes(fontes)}) e ela discorda do tipo gravado (${tipoAtual || "vazio"}).` };
}

function descreverFontes(fontes: FontesDoTipo): string {
  const partes = [
    fontes.conselho && `conselho: ${fontes.conselho}`,
    fontes.pagina && `página antiga: ${fontes.pagina}`,
    fontes.planilha && `planilha: ${fontes.planilha}`,
  ].filter(Boolean);
  return partes.join("; ");
}

// Nome de empresa (órteses e próteses), pelo próprio nome cadastrado.
export function pareceEmpresaDeOrteses(nome: string): boolean {
  return /\b(ortoped|ortese|protese|ltda|eireli|shopping)/.test(nomeParaOrdenar(nome));
}

export type ProfissionalAuditado = {
  id: string;
  tipo: string;
  nome: string;
  registro: string;
  pais: string;
  uf: string;
  cidades: string[];
  excluido: boolean;
  origem: { sistema: string; chave: string } | null;
};

export type RegistroDaOrigem = { fonte?: string | null; revisar?: unknown[] };
export type RegistroDaPlanilha = { tipo?: string | null };

export type PontoDaAuditoria = { id: string; assunto: "tipo" | "duplicado" | "local" | "empresa"; motivo: string };

export type ResultadoDaAuditoria = {
  total: number;
  ativos: number;
  ocultos: number;
  naLixeira: number;
  porTipo: Record<string, number>;
  confere: number;
  correcoes: { id: string; de: string; para: TipoDeProfissional; fontes: FontesDoTipo }[];
  duvidas: PontoDaAuditoria[];
  pontos: PontoDaAuditoria[];
};

// Observações da página antiga que tratam de local (estado, cidade, DDD).
function observacoesDeLocal(origem: RegistroDaOrigem | undefined): string[] {
  return (origem?.revisar ?? []).filter(
    (nota): nota is string => typeof nota === "string" && /\b(estado|estados|cidade|DDD|UF definida|UF principal)\b/i.test(nota) && !/whatsapp/i.test(nota),
  );
}

// Observações da página antiga que põem o tipo em dúvida (ex.: "parece
// fisioterapeuta", pessoa e empresa no mesmo registro).
function observacoesDeTipo(origem: RegistroDaOrigem | undefined): string[] {
  return (origem?.revisar ?? []).filter(
    (nota): nota is string => typeof nota === "string" && /(parece|declara\w*) (ser )?(fisioterapeuta|m[eé]dic|psic[oó]log|ortesista)|pessoa e empresa/i.test(nota),
  );
}

export function auditarClassificacao(entrada: {
  profissionais: (ProfissionalAuditado & { ativo: boolean })[];
  origem: Map<string, RegistroDaOrigem>;
  planilha: Map<string, RegistroDaPlanilha>;
}): ResultadoDaAuditoria {
  const { profissionais, origem, planilha } = entrada;
  const resultado: ResultadoDaAuditoria = {
    total: profissionais.length,
    ativos: profissionais.filter((p) => p.ativo && !p.excluido).length,
    ocultos: profissionais.filter((p) => !p.ativo && !p.excluido).length,
    naLixeira: profissionais.filter((p) => p.excluido).length,
    porTipo: {},
    confere: 0,
    correcoes: [],
    duvidas: [],
    pontos: [],
  };

  for (const profissional of profissionais) {
    resultado.porTipo[profissional.tipo || "(vazio)"] = (resultado.porTipo[profissional.tipo || "(vazio)"] ?? 0) + 1;
    const daOrigem = profissional.origem?.sistema === "wix" ? origem.get(profissional.origem.chave) : undefined;
    const daPlanilha = profissional.origem?.sistema === "cadastro-lote" ? planilha.get(profissional.origem.chave) : undefined;
    const fontes: FontesDoTipo = {
      conselho: tipoPeloConselho(profissional.registro),
      pagina: tipoPelaPagina(daOrigem?.fonte),
      planilha: tipoPelaPlanilha(daPlanilha?.tipo),
    };
    const decisao = decidirTipo(profissional.tipo, fontes);
    if (decisao.decisao === "confere") resultado.confere += 1;
    else if (decisao.decisao === "corrigir") resultado.correcoes.push({ id: profissional.id, de: profissional.tipo, para: decisao.para, fontes });
    else resultado.duvidas.push({ id: profissional.id, assunto: "tipo", motivo: decisao.motivo });

    // "Outros" nunca é corrigido sozinho: a página antiga é a única fonte.
    if (decisao.decisao === "confere" && profissional.tipo === "Outros") {
      resultado.duvidas.push({ id: profissional.id, assunto: "tipo", motivo: `Está em "Outros" (${descreverFontes(fontes)}); confirmar se é outra profissão.` });
    }

    for (const nota of observacoesDeTipo(daOrigem)) {
      resultado.duvidas.push({ id: profissional.id, assunto: "tipo", motivo: `Observação da página antiga: ${nota}` });
    }

    const empresa = pareceEmpresaDeOrteses(profissional.nome) || (daOrigem?.revisar ?? []).some((nota) => typeof nota === "string" && /empresa/i.test(nota));
    if (empresa && profissional.tipo !== "Ortesistas") {
      resultado.pontos.push({ id: profissional.id, assunto: "empresa", motivo: `Parece empresa de órteses e está em ${profissional.tipo || "nenhum tipo"}.` });
    }

    if (profissional.pais !== "BR" && profissional.uf) {
      resultado.pontos.push({ id: profissional.id, assunto: "local", motivo: `UF ${profissional.uf} preenchida para país fora do Brasil (${profissional.pais}).` });
    }
    if (profissional.pais === "BR" && !profissional.uf) {
      resultado.pontos.push({ id: profissional.id, assunto: "local", motivo: "No Brasil e sem UF (não entra no filtro por estado)." });
    }
    if (profissional.cidades.length === 0) {
      resultado.pontos.push({ id: profissional.id, assunto: "local", motivo: "Sem cidade." });
    }
    for (const nota of observacoesDeLocal(daOrigem)) {
      resultado.pontos.push({ id: profissional.id, assunto: "local", motivo: `Observação da página antiga: ${nota}` });
    }
  }

  // Duplicados: mesmo nome (sem tratamento e sem acento), mesmo número de
  // registro, ou mesmo primeiro e último nome (possível, a conferir).
  const fora = profissionais.filter((p) => !p.excluido);
  const grupos = new Map<string, string[]>();
  const juntar = (chave: string, id: string) => grupos.set(chave, [...(grupos.get(chave) ?? []), id]);
  for (const p of fora) {
    const nome = nomeParaOrdenar(p.nome);
    juntar(`nome:${nome}`, p.id);
    const partes = nome.split(" ");
    if (partes.length > 1) juntar(`extremos:${partes[0]} ${partes[partes.length - 1]}`, p.id);
    const digitos = p.registro.replace(/\D/g, "");
    if (digitos.length >= 4) juntar(`registro:${digitos}`, p.id);
  }
  for (const [chave, ids] of grupos) {
    if (ids.length < 2) continue;
    const [tipo] = chave.split(":");
    const motivo = tipo === "nome" ? "Mesmo nome" : tipo === "registro" ? "Mesmo número de registro" : "Mesmo primeiro e último nome (pode ser só coincidência)";
    for (const id of ids) resultado.pontos.push({ id, assunto: "duplicado", motivo: `${motivo} de ${ids.filter((outro) => outro !== id).join(", ")}.` });
  }
  return resultado;
}

// Campos do formulário (DadosDoProfissional), na ordem do tipo.
const CAMPOS_DOS_DADOS = [
  "tipo", "tratamento", "nome", "registro", "metodos", "pais", "uf", "cidades", "telerreabilitacao", "whatsapp", "telefones",
  "instagram", "facebook", "email", "endereco", "site", "outrosPerfis", "emailsExtras", "bio", "ativo", "ordem", "fotoMidiaId",
] as const satisfies readonly (keyof DadosDoProfissional)[];

const VAZIOS: Partial<Record<keyof DadosDoProfissional, unknown>> = {
  metodos: [], cidades: [], telefones: [], outrosPerfis: [], emailsExtras: [], telerreabilitacao: false, ativo: false, ordem: 0, fotoMidiaId: null,
};

// Grava as correções pelo mesmo caminho do painel (gravarProfissional, com o
// registro em logAlteracoes), mudando só o tipo. Na simulação, não grava.
export async function aplicarCorrecoes(opcoes: {
  db: Firestore;
  correcoes: ResultadoDaAuditoria["correcoes"];
  execucao: string;
}): Promise<{ gravados: string[]; falhas: { id: string; motivo: string }[] }> {
  const gravados: string[] = [];
  const falhas: { id: string; motivo: string }[] = [];
  for (const correcao of opcoes.correcoes) {
    if (!TIPOS.includes(correcao.para)) {
      falhas.push({ id: correcao.id, motivo: "Tipo fora da lista." });
      continue;
    }
    const atual = await opcoes.db.collection("profissionais").doc(correcao.id).get();
    if (!atual.exists) {
      falhas.push({ id: correcao.id, motivo: "Documento não encontrado." });
      continue;
    }
    if (atual.get("tipo") !== correcao.de) {
      falhas.push({ id: correcao.id, motivo: "O tipo mudou depois da auditoria; nada foi gravado." });
      continue;
    }
    const dados = Object.fromEntries(CAMPOS_DOS_DADOS.map((campo) => [campo, atual.get(campo) ?? (campo in VAZIOS ? VAZIOS[campo] : "")])) as DadosDoProfissional;
    dados.tipo = correcao.para;
    const gravado = await gravarProfissional(opcoes.db, correcao.id, dados, AUTOR_DO_AJUSTE, {
      registro: { origem: "migracao", execucao: opcoes.execucao, resumo: `Tipo corrigido pela auditoria de classificação: ${correcao.de} para ${correcao.para}.` },
    });
    if (gravado.ok) gravados.push(correcao.id);
    else falhas.push({ id: correcao.id, motivo: gravado.mensagem });
  }
  return { gravados, falhas };
}
