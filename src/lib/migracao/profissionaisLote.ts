// Cadastro de profissionais em lote (04/11/2026), a partir de um arquivo
// privado em docs/dados-privados/ (fora do Git), com fotos opcionais numa
// pasta também privada. Diferente da migração do site antigo
// (lib/migracao/profissionais.ts): os profissionais entram ATIVOS, os dados
// passam pela MESMA validação do painel (validarProfissional) e pela MESMA
// gravação (gravarProfissional), e a foto vem de um arquivo local, enviada
// pelo mesmo processamento da biblioteca de mídia (importarImagem).
//
// Nada é corrigido nem inventado: o registro que o validador recusa fica de
// fora, com o motivo no relatório, e os outros seguem.
//
// Idempotente por origem.chave: repetir não duplica o profissional; se a foto
// chegou depois, a nova execução só envia a foto e a liga ao profissional.
//
// Sem "server-only" e com o Firebase por parâmetro: roda no script
// (scripts/cadastrar-profissionais-lote.mts) e nos testes no emulador. Os
// relatórios identificam cada registro pela posição no arquivo (1 a N), sem
// nomes, chaves nem contatos.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Firestore } from "firebase-admin/firestore";
import { PAISES, TAGS_DE_PROFISSIONAIS, UFS } from "../../config/profissionais.ts";
import { COLECAO_PROFISSIONAIS, gravarProfissional } from "../gravacao/profissionais.ts";
import { COLECAO_LOG, registrarNaTransacao, registrarNoLote } from "../log/alteracoes.ts";
import {
  COLECAO_MIDIAS,
  REFERENCIAS_DE_MIDIA,
  ajustarComoNoNavegador,
  importarImagem,
  listarUsos,
  midiaPodeSerEscolhida,
  prepararVariantes,
  type ServicosDeMidia,
} from "../midia/biblioteca.ts";
import { caminhoDaVariante, LARGURAS_DAS_VARIANTES } from "../midia/regras.ts";
import { validarProfissional, type DadosDoProfissional } from "../profissionais.ts";
import { AUTOR_DA_MIGRACAO, type Modo } from "./execucao.ts";

// Sistema de origem dos documentos criados por este cadastro (profissionais e
// fotos). Diferente do "wix" da migração do site antigo.
export const SISTEMA_DO_LOTE = "cadastro-lote";

// Extensões aceitas para a foto, procuradas nesta ordem.
export const EXTENSOES_DA_FOTO = ["jpg", "jpeg", "png", "webp"] as const;

// Abaixo desta largura (a menor variante do site), a foto é sinalizada como
// de baixa resolução no relatório (é enviada mesmo assim).
export const LARGURA_MINIMA_RECOMENDADA = LARGURAS_DAS_VARIANTES[0];

const FORMATO_DA_CHAVE = /^lote\d+-[a-z0-9-]{1,60}$/;

const CAMPOS_DO_REGISTRO = ["chave", "tipo", "tratamento", "nome", "registro", "pais", "uf", "cidades", "instagram", "whatsapp", "email"] as const;
const OBRIGATORIOS = ["chave", "tipo", "nome", "pais", "cidades"] as const;

export type RegistroDoLote = {
  posicao: number;
  chave: string;
  tipo: string;
  tratamento: string;
  nome: string;
  registro: string;
  pais: string;
  uf: string;
  cidades: string[];
  instagram: string;
  whatsapp: string;
  email: string;
};

export type EntradaDoLote = { pastaDasFotos: string; registros: RegistroDoLote[] };

// Confere a forma do arquivo. Campo desconhecido é recusado (assim nada fora
// do combinado, como apresentação, telefone ou endereço, entra por engano).
// As mensagens citam a posição e o nome do campo, nunca o valor.
export function validarEntradaDoLote(dados: unknown): { ok: true; entrada: EntradaDoLote } | { ok: false; erros: string[] } {
  const erros: string[] = [];
  if (!dados || typeof dados !== "object") return { ok: false, erros: ["O arquivo precisa ser um objeto JSON."] };
  const raiz = dados as Record<string, unknown>;
  if (raiz.versao !== 1) erros.push("Campo versao precisa ser 1.");
  if (typeof raiz.pastaDasFotos !== "string" || !raiz.pastaDasFotos.trim()) erros.push("Campo pastaDasFotos ausente.");
  if (!Array.isArray(raiz.profissionais) || raiz.profissionais.length === 0) erros.push("Campo profissionais precisa ser uma lista com pelo menos um registro.");
  const desconhecidosNaRaiz = Object.keys(raiz).filter((campo) => !["versao", "pastaDasFotos", "profissionais"].includes(campo));
  if (desconhecidosNaRaiz.length > 0) erros.push(`Campos desconhecidos na raiz: ${desconhecidosNaRaiz.join(", ")}.`);
  if (erros.length > 0) return { ok: false, erros };

  const chaves = new Set<string>();
  const registros: RegistroDoLote[] = [];
  (raiz.profissionais as unknown[]).forEach((item, indice) => {
    const posicao = indice + 1;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      erros.push(`Registro ${posicao}: não é um objeto.`);
      return;
    }
    const campos = item as Record<string, unknown>;
    const desconhecidos = Object.keys(campos).filter((campo) => !(CAMPOS_DO_REGISTRO as readonly string[]).includes(campo));
    if (desconhecidos.length > 0) erros.push(`Registro ${posicao}: campos desconhecidos: ${desconhecidos.join(", ")}.`);
    for (const campo of OBRIGATORIOS) if (campos[campo] === undefined) erros.push(`Registro ${posicao}: campo ${campo} ausente.`);
    for (const campo of CAMPOS_DO_REGISTRO) {
      if (campo === "cidades" || campos[campo] === undefined) continue;
      if (typeof campos[campo] !== "string") erros.push(`Registro ${posicao}: campo ${campo} precisa ser texto.`);
    }
    if (campos.cidades !== undefined && (!Array.isArray(campos.cidades) || campos.cidades.some((cidade) => typeof cidade !== "string"))) {
      erros.push(`Registro ${posicao}: campo cidades precisa ser uma lista de textos.`);
    }
    const chave = typeof campos.chave === "string" ? campos.chave : "";
    if (!FORMATO_DA_CHAVE.test(chave)) erros.push(`Registro ${posicao}: chave fora do formato lote<n>-<nome>.`);
    else if (chaves.has(chave)) erros.push(`Registro ${posicao}: chave repetida.`);
    chaves.add(chave);
    const texto = (campo: string) => (typeof campos[campo] === "string" ? (campos[campo] as string) : "");
    registros.push({
      posicao,
      chave,
      tipo: texto("tipo"),
      tratamento: texto("tratamento"),
      nome: texto("nome"),
      registro: texto("registro"),
      pais: texto("pais"),
      uf: texto("uf"),
      cidades: Array.isArray(campos.cidades) ? campos.cidades.filter((cidade): cidade is string => typeof cidade === "string") : [],
      instagram: texto("instagram"),
      whatsapp: texto("whatsapp"),
      email: texto("email"),
    });
  });
  if (erros.length > 0) return { ok: false, erros };
  return { ok: true, entrada: { pastaDasFotos: (raiz.pastaDasFotos as string).trim(), registros } };
}

// Monta o mesmo FormData que o formulário do painel enviaria e passa pela
// mesma validação. Fixos do lote: ativo, ordem 0, sem telerreabilitação, sem
// métodos, sem apresentação, sem Facebook e sem foto (a foto é ligada depois,
// pela biblioteca). Cidades vão uma por linha (o painel aceita vírgula, ponto
// e vírgula ou linha), para que nenhuma seja partida.
export function converterRegistroDoLote(registro: RegistroDoLote) {
  const formulario = new FormData();
  formulario.set("tipo", registro.tipo);
  formulario.set("tratamento", registro.tratamento);
  formulario.set("nome", registro.nome);
  formulario.set("registro", registro.registro);
  formulario.set("pais", registro.pais);
  formulario.set("uf", registro.uf);
  formulario.set("cidades", registro.cidades.join("\n"));
  formulario.set("whatsapp", registro.whatsapp);
  formulario.set("telefones", "");
  formulario.set("instagram", registro.instagram);
  formulario.set("facebook", "");
  formulario.set("email", registro.email);
  formulario.set("bio", "");
  formulario.set("ordem", "0");
  formulario.set("ativo", "sim");
  formulario.set("fotoMidiaId", "");
  return validarProfissional(formulario);
}

// A cidade com vírgula seria partida pelo formulário; o lote recusa em vez de
// mudar o valor.
function recusasAntesDoValidador(registro: RegistroDoLote): Record<string, string> {
  const erros: Record<string, string> = {};
  if (registro.cidades.some((cidade) => /[,;\n]/.test(cidade))) erros.cidades = "Cidade com vírgula, ponto e vírgula ou quebra de linha.";
  if (!(TAGS_DE_PROFISSIONAIS as readonly string[]).includes(registro.tipo)) erros.tipo = "Tipo fora da lista do painel.";
  if (!PAISES.some((pais) => pais.codigo === registro.pais)) erros.pais = "País fora da lista do painel.";
  // O validador apaga a UF fora do Brasil; o lote recusa UF preenchida em
  // outro país, para não descartar um valor sem avisar.
  if (registro.pais !== "BR" && registro.uf.trim()) erros.uf = "UF preenchida para país fora do Brasil.";
  if (registro.pais === "BR" && !(UFS as readonly string[]).includes(registro.uf.trim().toUpperCase())) erros.uf = "UF fora da lista do painel.";
  return erros;
}

// "lote1-exemplo" procura exemplo.jpg, exemplo.jpeg, exemplo.png ou exemplo.webp.
export function chaveDaFoto(chave: string): string {
  return chave.replace(/^lote\d+-/, "");
}

export type FotoNoDisco = { estado: "semArquivo" } | { estado: "varios"; quantidade: number } | { estado: "arquivo"; caminho: string; extensao: string };

export function acharFoto(pasta: string, chave: string): FotoNoDisco {
  if (!existsSync(pasta)) return { estado: "semArquivo" };
  const base = chaveDaFoto(chave);
  const nomes = readdirSync(pasta);
  const achados = EXTENSOES_DA_FOTO.flatMap((extensao) => nomes.filter((nome) => nome.toLowerCase() === `${base}.${extensao}`).map((nome) => ({ nome, extensao })));
  if (achados.length === 0) return { estado: "semArquivo" };
  if (achados.length > 1) return { estado: "varios", quantidade: achados.length };
  return { estado: "arquivo", caminho: join(pasta, achados[0].nome), extensao: achados[0].extensao };
}

export type FotoPreparada =
  | { ok: true; bytes: Uint8Array; largura: number; altura: number; tamanhoOriginal: number; reduzida: boolean; baixaResolucao: boolean }
  | { ok: false; motivo: string; tamanhoOriginal: number };

// O mesmo caminho da migração e do navegador: reduz só acima de 2560 px ou do
// limite de tamanho (o arquivo no disco não muda) e confere se o processamento
// da biblioteca aceita a imagem, sem gravar nada.
export async function prepararFoto(bytes: Uint8Array): Promise<FotoPreparada> {
  const ajustada = await ajustarComoNoNavegador(bytes);
  if (!ajustada.ok) return { ok: false, motivo: ajustada.mensagem, tamanhoOriginal: bytes.length };
  const preparo = await prepararVariantes(ajustada.bytes);
  if (!preparo.ok) return { ok: false, motivo: preparo.mensagem, tamanhoOriginal: bytes.length };
  return {
    ok: true,
    bytes: ajustada.bytes,
    largura: preparo.largura,
    altura: preparo.altura,
    tamanhoOriginal: bytes.length,
    reduzida: ajustada.reduzida,
    baixaResolucao: preparo.largura < LARGURA_MINIMA_RECOMENDADA,
  };
}

// Nome sem acento, sem maiúsculas e sem espaços extras.
function normalizarNome(nome: string): string {
  return nome.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function digitosDoRegistro(registro: string): string {
  const digitos = registro.replace(/\D/g, "");
  return digitos.length >= 4 ? digitos : "";
}

// "ana" e "anabela" não; "fulana" e "fulanana" sim: um começa com o outro, com pelo menos 4 letras.
function primeiroNomeParecido(um: string, outro: string): boolean {
  const [curto, longo] = um.length <= outro.length ? [um, outro] : [outro, um];
  return curto.length >= 4 && longo.startsWith(curto);
}

type Existente = { id: string; nome: string; registro: string };

// Possível duplicado entre os profissionais que já existem fora da lixeira:
// nome igual, mesmo primeiro e último nome, ou o mesmo número de registro.
// Só avisa (ids e motivo); quem decide é o responsável.
export function possiveisDuplicados(registro: RegistroDoLote, existentes: Existente[]): { id: string; motivo: string }[] {
  const nome = normalizarNome(registro.nome);
  const partes = nome.split(" ");
  const numero = digitosDoRegistro(registro.registro);
  const achados: { id: string; motivo: string }[] = [];
  for (const existente of existentes) {
    const outro = normalizarNome(existente.nome);
    const outrasPartes = outro.split(" ");
    if (outro === nome) achados.push({ id: existente.id, motivo: "nome igual" });
    else if (partes.length > 1 && outrasPartes[0] === partes[0] && outrasPartes.at(-1) === partes.at(-1)) achados.push({ id: existente.id, motivo: "mesmo primeiro e último nome" });
    else if (partes.length > 1 && outrasPartes.includes(partes.at(-1) as string) && primeiroNomeParecido(partes[0], outrasPartes[0])) achados.push({ id: existente.id, motivo: "primeiro nome parecido e mesmo sobrenome" });
    else if (numero && digitosDoRegistro(existente.registro) === numero) achados.push({ id: existente.id, motivo: "mesmo número de registro" });
  }
  return achados;
}

type DocumentoDoLote = { id: string; fotoMidiaId: string | null };

async function profissionaisDoLote(db: Firestore): Promise<Map<string, DocumentoDoLote>> {
  const documentos = await db.collection(COLECAO_PROFISSIONAIS).where("origem.sistema", "==", SISTEMA_DO_LOTE).get();
  const mapa = new Map<string, DocumentoDoLote>();
  for (const documento of documentos.docs) {
    const chave = documento.get("origem.chave");
    if (typeof chave === "string") mapa.set(chave, { id: documento.id, fotoMidiaId: (documento.get("fotoMidiaId") as string | null) ?? null });
  }
  return mapa;
}

async function fotosDoLote(db: Firestore): Promise<Map<string, { id: string; naLixeira: boolean }>> {
  const documentos = await db.collection(COLECAO_MIDIAS).where("origem.sistema", "==", SISTEMA_DO_LOTE).get();
  const mapa = new Map<string, { id: string; naLixeira: boolean }>();
  for (const documento of documentos.docs) {
    const chave = documento.get("origem.midiaId");
    if (typeof chave === "string") mapa.set(chave, { id: documento.id, naLixeira: Boolean(documento.get("excluidoEm")) });
  }
  return mapa;
}

async function outrosProfissionais(db: Firestore): Promise<Existente[]> {
  const documentos = await db.collection(COLECAO_PROFISSIONAIS).select("nome", "registro", "excluidoEm", "origem").get();
  return documentos.docs
    .filter((documento) => !documento.get("excluidoEm") && documento.get("origem.sistema") !== SISTEMA_DO_LOTE)
    .map((documento) => ({ id: documento.id, nome: String(documento.get("nome") ?? ""), registro: String(documento.get("registro") ?? "") }));
}

// Liga a foto ao profissional só se ele ainda está sem foto (nunca troca uma
// foto escolhida por uma pessoa). Grava só fotoMidiaId e atualizadoEm, com uma
// linha no registro.
async function ligarFoto(db: Firestore, profissionalId: string, midiaId: string, execucao: string): Promise<"ligada" | "jaTinhaFoto" | "midiaIndisponivel"> {
  if (!(await midiaPodeSerEscolhida(db, midiaId))) return "midiaIndisponivel";
  const referencia = db.collection(COLECAO_PROFISSIONAIS).doc(profissionalId);
  return db.runTransaction(async (transacao) => {
    const atual = await transacao.get(referencia);
    if (!atual.exists || atual.get("fotoMidiaId")) return "jaTinhaFoto" as const;
    transacao.update(referencia, { fotoMidiaId: midiaId, atualizadoEm: new Date() });
    registrarNaTransacao(db, transacao, AUTOR_DA_MIGRACAO, {
      colecao: COLECAO_PROFISSIONAIS,
      documentoId: profissionalId,
      acao: "editar",
      campos: ["fotoMidiaId"],
      resumo: "Foto ligada pelo cadastro em lote.",
      origem: "migracao",
      execucao,
    });
    return "ligada" as const;
  });
}

type EstadoDaFoto = "registroRecusado" | "semArquivo" | "varios" | "recusada" | "pronta" | "jaLigada" | "naLixeira";

type ItemDoLote = {
  registro: RegistroDoLote;
  dados: DadosDoProfissional | null;
  erros: Record<string, string>;
  existente: DocumentoDoLote | null;
  noDisco: FotoNoDisco;
  fotoGravada: { id: string; naLixeira: boolean } | null;
  foto: EstadoDaFoto;
  preparada: FotoPreparada | null;
  duplicados: { id: string; motivo: string }[];
};

export type RelatorioDoLote = Awaited<ReturnType<typeof cadastrarLote>>;

export async function cadastrarLote(opcoes: { servicos: ServicosDeMidia; entrada: EntradaDoLote; modo: Modo; execucao: string; lerArquivo?: (caminho: string) => Uint8Array }) {
  const { servicos, entrada, modo, execucao, lerArquivo = (caminho) => readFileSync(caminho) } = opcoes;
  const { db } = servicos;
  const iniciadoEm = new Date().toISOString();
  const existentes = await profissionaisDoLote(db);
  const fotosExistentes = await fotosDoLote(db);
  const outros = await outrosProfissionais(db);

  const itens: ItemDoLote[] = [];
  for (const registro of entrada.registros) {
    const antes = recusasAntesDoValidador(registro);
    const validado = converterRegistroDoLote(registro);
    const erros = { ...antes, ...(validado.ok ? {} : validado.erros) };
    const dados: DadosDoProfissional | null = validado.ok && Object.keys(antes).length === 0 ? validado.dados : null;
    const existente = existentes.get(registro.chave) ?? null;

    const noDisco = acharFoto(entrada.pastaDasFotos, registro.chave);
    const fotoGravada = fotosExistentes.get(registro.chave) ?? null;
    let foto: EstadoDaFoto;
    let preparada: FotoPreparada | null = null;
    if (!existente && !dados) foto = "registroRecusado";
    else if (existente?.fotoMidiaId) foto = "jaLigada";
    else if (fotoGravada?.naLixeira) foto = "naLixeira";
    else if (fotoGravada) foto = "pronta";
    else if (noDisco.estado === "semArquivo") foto = "semArquivo";
    else if (noDisco.estado === "varios") foto = "varios";
    else {
      preparada = await prepararFoto(lerArquivo(noDisco.caminho));
      foto = preparada.ok ? "pronta" : "recusada";
    }
    itens.push({ registro, dados, erros, existente, noDisco, fotoGravada, foto, preparada, duplicados: existente ? [] : possiveisDuplicados(registro, outros) });
  }

  const criados: { posicao: number; profissionalId: string }[] = [];
  const fotosLigadas: { posicao: number; profissionalId: string; midiaId: string }[] = [];
  const falhas: { posicao: number; etapa: string; motivo: string }[] = [];

  if (modo === "executar") {
    for (const item of itens) {
      let profissionalId = item.existente?.id ?? null;
      if (!profissionalId) {
        if (!item.dados) continue;
        try {
          const gravado = await gravarProfissional(db, null, item.dados, AUTOR_DA_MIGRACAO, {
            extras: { origem: { sistema: SISTEMA_DO_LOTE, chave: item.registro.chave, execucao } },
            registro: { origem: "migracao", execucao, resumo: "Profissional cadastrado em lote." },
          });
          if (!gravado.ok) {
            falhas.push({ posicao: item.registro.posicao, etapa: "cadastro", motivo: gravado.mensagem });
            continue;
          }
          profissionalId = gravado.id;
          criados.push({ posicao: item.registro.posicao, profissionalId });
        } catch (erro) {
          falhas.push({ posicao: item.registro.posicao, etapa: "cadastro", motivo: erro instanceof Error ? erro.message : String(erro) });
          continue;
        }
      }
      if (item.foto !== "pronta") continue;
      try {
        let midiaId = item.fotoGravada?.id ?? null;
        if (!midiaId && item.preparada?.ok) {
          const importada = await importarImagem(
            servicos,
            {
              bytes: item.preparada.bytes,
              alt: `Foto de ${item.dados?.nome ?? item.registro.nome}`,
              origem: { sistema: SISTEMA_DO_LOTE, midiaId: item.registro.chave, execucao },
              dono: { tipo: "profissional", id: profissionalId, campo: "foto" },
              resumo: "Foto enviada pelo cadastro de profissionais em lote.",
            },
            AUTOR_DA_MIGRACAO,
          );
          if (!importada.ok) {
            falhas.push({ posicao: item.registro.posicao, etapa: "foto", motivo: importada.mensagem });
            continue;
          }
          midiaId = importada.id;
        }
        if (!midiaId) continue;
        const ligacao = await ligarFoto(db, profissionalId, midiaId, execucao);
        if (ligacao === "ligada") fotosLigadas.push({ posicao: item.registro.posicao, profissionalId, midiaId });
        else falhas.push({ posicao: item.registro.posicao, etapa: "foto", motivo: ligacao === "jaTinhaFoto" ? "o profissional já tinha foto" : "imagem indisponível na biblioteca" });
      } catch (erro) {
        falhas.push({ posicao: item.registro.posicao, etapa: "foto", motivo: erro instanceof Error ? erro.message : String(erro) });
      }
    }
  }

  const posicoes = (filtro: (item: ItemDoLote) => boolean) => itens.filter(filtro).map((item) => item.registro.posicao);
  return {
    ok: true as const,
    script: "cadastrar-profissionais-lote",
    execucao,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    contagens: {
      noArquivo: itens.length,
      jaExistentes: posicoes((item) => Boolean(item.existente)).length,
      aCriar: posicoes((item) => !item.existente && Boolean(item.dados)).length,
      recusados: posicoes((item) => !item.existente && !item.dados).length,
      possiveisDuplicados: posicoes((item) => item.duplicados.length > 0).length,
      fotos: {
        aEnviarOuLigar: posicoes((item) => item.foto === "pronta").length,
        jaLigadas: posicoes((item) => item.foto === "jaLigada").length,
        semArquivo: posicoes((item) => item.foto === "semArquivo").length,
        recusadas: posicoes((item) => item.foto === "recusada" || item.foto === "varios").length,
        naLixeira: posicoes((item) => item.foto === "naLixeira").length,
        baixaResolucao: posicoes((item) => Boolean(item.preparada?.ok && item.preparada.baixaResolucao)).length,
        reduzidas: posicoes((item) => Boolean(item.preparada?.ok && item.preparada.reduzida)).length,
      },
      criados: criados.length,
      fotosLigadas: fotosLigadas.length,
      falhas: falhas.length,
    },
    // Por posição, sem nomes nem valores: o que seria gravado e o que falta.
    registros: itens.map((item) => ({
      posicao: item.registro.posicao,
      situacao: item.existente ? "jaExiste" : item.dados ? "aCriar" : "recusado",
      // Só os nomes dos campos e as mensagens do validador (sem valores).
      recusas: item.existente ? {} : item.erros,
      camposPreenchidos: item.dados ? Object.entries(item.dados).filter(([, valor]) => (Array.isArray(valor) ? valor.length > 0 : valor !== "" && valor !== null && valor !== false)).map(([campo]) => campo) : [],
      tipo: item.dados?.tipo ?? null,
      pais: item.dados?.pais ?? null,
      ativo: item.dados?.ativo ?? null,
      foto: item.foto,
      fotoArquivo: item.noDisco.estado === "arquivo" ? { extensao: item.noDisco.extensao } : null,
      fotoMedidas: item.preparada?.ok ? { largura: item.preparada.largura, altura: item.preparada.altura, bytesNoDisco: item.preparada.tamanhoOriginal, reduzidaComoNoNavegador: item.preparada.reduzida, baixaResolucao: item.preparada.baixaResolucao } : null,
      fotoRecusa: item.preparada && !item.preparada.ok ? { motivo: item.preparada.motivo, bytesNoDisco: item.preparada.tamanhoOriginal } : item.noDisco.estado === "varios" ? { motivo: `${item.noDisco.quantidade} arquivos para a mesma chave` } : null,
      possiveisDuplicados: item.duplicados,
    })),
    criados,
    fotosLigadas,
    falhas,
  };
}

// Desfaz uma execução. Profissionais criados por ela saem (pula o ligado à
// diretoria e o alterado por uma pessoa depois). Fotos enviadas por ela saem
// (arquivos e documento) se não forem usadas fora dos profissionais do lote
// nem alteradas por uma pessoa; se a foto estava ligada a um profissional que
// fica (criado numa execução anterior), o campo fotoMidiaId volta a vazio.
export async function desfazerLote(opcoes: { servicos: ServicosDeMidia; execucaoAlvo: string; execucao: string; modo: Modo }) {
  const { servicos, execucaoAlvo, execucao, modo } = opcoes;
  const { db, bucket } = servicos;
  const iniciadoEm = new Date().toISOString();
  const editadoPorPessoa = async (id: string) => (await db.collection(COLECAO_LOG).where("documentoId", "==", id).get()).docs.some((registro) => registro.get("origem") !== "migracao");

  const profissionais = (await db.collection(COLECAO_PROFISSIONAIS).where("origem.execucao", "==", execucaoAlvo).get()).docs.filter((documento) => documento.get("origem.sistema") === SISTEMA_DO_LOTE);
  const midias = (await db.collection(COLECAO_MIDIAS).where("origem.execucao", "==", execucaoAlvo).get()).docs.filter((documento) => documento.get("origem.sistema") === SISTEMA_DO_LOTE);

  const pulados: { colecao: string; id: string; motivo: string }[] = [];
  const profissionaisASair: string[] = [];
  for (const documento of profissionais) {
    if (!(await db.collection("diretoria").where("profissionalId", "==", documento.id).limit(1).get()).empty) pulados.push({ colecao: COLECAO_PROFISSIONAIS, id: documento.id, motivo: "ligado à diretoria" });
    else if (await editadoPorPessoa(documento.id)) pulados.push({ colecao: COLECAO_PROFISSIONAIS, id: documento.id, motivo: "alterado por uma pessoa depois do cadastro" });
    else profissionaisASair.push(documento.id);
  }

  const midiasASair: { id: string; larguras: number[]; desligarDe: string[] }[] = [];
  for (const documento of midias) {
    if (await editadoPorPessoa(documento.id)) {
      pulados.push({ colecao: COLECAO_MIDIAS, id: documento.id, motivo: "alterada por uma pessoa depois do envio" });
      continue;
    }
    // Quem usa a foto: só profissionais do lote, e nenhum alterado por pessoa.
    const usando = (await db.collection(COLECAO_PROFISSIONAIS).where("fotoMidiaId", "==", documento.id).get()).docs;
    const usoForaDoLote = usando.some((uso) => uso.get("origem.sistema") !== SISTEMA_DO_LOTE);
    const ficam = usando.filter((uso) => !profissionaisASair.includes(uso.id));
    let usoPorPessoa = false;
    for (const uso of ficam) if (await editadoPorPessoa(uso.id)) usoPorPessoa = true;
    const emOutraColecao = await usadaForaDosProfissionais(db, documento.id);
    if (usoForaDoLote || usoPorPessoa || emOutraColecao) {
      pulados.push({ colecao: COLECAO_MIDIAS, id: documento.id, motivo: "em uso fora do cadastro em lote" });
      continue;
    }
    const lista = documento.get("variantes");
    midiasASair.push({ id: documento.id, larguras: (Array.isArray(lista) ? lista : []).map((variante) => Number(variante.largura)), desligarDe: ficam.map((uso) => uso.id) });
  }

  if (modo === "executar") {
    for (const id of profissionaisASair) {
      const lote = db.batch();
      lote.delete(db.collection(COLECAO_PROFISSIONAIS).doc(id));
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, { colecao: COLECAO_PROFISSIONAIS, documentoId: id, acao: "excluir_definitivo", campos: [], resumo: `Cadastro em lote desfeito (execução ${execucaoAlvo}).`, origem: "migracao", execucao });
      await lote.commit();
    }
    for (const midia of midiasASair) {
      const lote = db.batch();
      for (const profissionalId of midia.desligarDe) {
        lote.update(db.collection(COLECAO_PROFISSIONAIS).doc(profissionalId), { fotoMidiaId: null, atualizadoEm: new Date() });
        registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, { colecao: COLECAO_PROFISSIONAIS, documentoId: profissionalId, acao: "editar", campos: ["fotoMidiaId"], resumo: `Foto do cadastro em lote desfeita (execução ${execucaoAlvo}).`, origem: "migracao", execucao });
      }
      lote.delete(db.collection(COLECAO_MIDIAS).doc(midia.id));
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, { colecao: COLECAO_MIDIAS, documentoId: midia.id, acao: "excluir_definitivo", campos: [], resumo: `Cadastro em lote desfeito (execução ${execucaoAlvo}).`, origem: "migracao", execucao });
      await lote.commit();
      for (const largura of midia.larguras) {
        for (const pasta of ["publico", "lixeira"] as const) await bucket.file(caminhoDaVariante(pasta, midia.id, largura)).delete({ ignoreNotFound: true });
      }
    }
  }

  return {
    script: "cadastrar-profissionais-lote (desfazer)",
    execucao,
    execucaoDesfeita: execucaoAlvo,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    contagens: {
      profissionaisEncontrados: profissionais.length,
      profissionaisDesfeitos: profissionaisASair.length,
      fotosEncontradas: midias.length,
      fotosDesfeitas: midiasASair.length,
      fotosDesligadas: midiasASair.reduce((soma, midia) => soma + midia.desligarDe.length, 0),
      pulados: pulados.length,
    },
    profissionaisDesfeitos: profissionaisASair,
    fotosDesfeitas: midiasASair.map((midia) => midia.id),
    pulados,
  };
}

// A foto aparece em alguma coleção que não a dos profissionais (ex.: alguém a
// escolheu para um post)? Confere os mesmos campos das outras referências.
async function usadaForaDosProfissionais(db: Firestore, midiaId: string): Promise<boolean> {
  const rotuloDosProfissionais = REFERENCIAS_DE_MIDIA.find((referencia) => referencia.colecao === COLECAO_PROFISSIONAIS)?.rotulo;
  const usos = await listarUsos(db, midiaId);
  return usos.some((uso) => uso.rotulo !== rotuloDosProfissionais);
}

export function relatorioDoLoteEmMarkdown(relatorio: RelatorioDoLote, projeto: string): string {
  const c = relatorio.contagens;
  const linhas = [
    `# Cadastro de profissionais em lote: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
    "",
    `Projeto: ${projeto}. Execução: ${relatorio.execucao}. Registros identificados pela posição no arquivo.`,
    "",
    "| Contagem | Valor |",
    "|---|---|",
    `| No arquivo | ${c.noArquivo} |`,
    `| Já existentes (mesma chave) | ${c.jaExistentes} |`,
    `| A criar | ${c.aCriar} |`,
    `| Recusados pelo validador | ${c.recusados} |`,
    `| Com possível duplicado | ${c.possiveisDuplicados} |`,
    `| Fotos a enviar ou ligar | ${c.fotos.aEnviarOuLigar} |`,
    `| Fotos já ligadas | ${c.fotos.jaLigadas} |`,
    `| Sem arquivo de foto | ${c.fotos.semArquivo} |`,
    `| Fotos recusadas | ${c.fotos.recusadas} |`,
    `| Fotos na lixeira | ${c.fotos.naLixeira} |`,
    `| Fotos de baixa resolução (menos de ${LARGURA_MINIMA_RECOMENDADA} px de largura) | ${c.fotos.baixaResolucao} |`,
    `| Fotos reduzidas como no navegador | ${c.fotos.reduzidas} |`,
    `| Criados | ${c.criados} |`,
    `| Fotos ligadas | ${c.fotosLigadas} |`,
    `| Falhas | ${c.falhas} |`,
    "",
    "## Por registro",
    "",
    "| Posição | Situação | Tipo | País | Ativo | Campos preenchidos | Foto | Medidas | Recusas |",
    "|---|---|---|---|---|---|---|---|---|",
    ...relatorio.registros.map((item) => {
      const medidas = item.fotoMedidas ? `${item.fotoMedidas.largura} x ${item.fotoMedidas.altura}${item.fotoMedidas.baixaResolucao ? ", BAIXA RESOLUÇÃO" : ""}${item.fotoMedidas.reduzidaComoNoNavegador ? ", reduzida" : ""}` : "";
      const recusas = [...Object.entries(item.recusas).map(([campo, motivo]) => `${campo}: ${motivo}`), item.fotoRecusa ? `foto: ${item.fotoRecusa.motivo}` : ""].filter(Boolean).join("; ");
      return `| ${item.posicao} | ${item.situacao} | ${item.tipo ?? ""} | ${item.pais ?? ""} | ${item.ativo === null ? "" : item.ativo ? "sim" : "não"} | ${item.camposPreenchidos.join(", ")} | ${item.foto} | ${medidas} | ${recusas} |`;
    }),
    "",
    "## Possíveis duplicados",
    "",
    ...relatorio.registros.flatMap((item) => item.possiveisDuplicados.map((duplicado) => `- Posição ${item.posicao}: ${duplicado.motivo} (profissional ${duplicado.id})`)),
    "",
    "## Falhas",
    "",
    ...relatorio.falhas.map((falha) => `- Posição ${falha.posicao} (${falha.etapa}): ${falha.motivo}`),
    "",
  ];
  return linhas.join("\n");
}
