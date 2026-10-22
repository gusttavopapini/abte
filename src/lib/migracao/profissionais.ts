// Migração dos profissionais do site antigo (etapa 6, degrau 2), a partir de
// docs/dados-privados/profissionais.json (fora do Git). Grava só os campos do
// modelo atual (DadosDoProfissional), todos com ativo = false: nenhum aparece
// no site antes da revisão. Nada é inventado nem corrigido por inferência: o
// que não passa na mesma validação do painel fica vazio e o registro vai para
// revisão. Os campos do arquivo fora do modelo (conselho, telefones,
// whatsappLink, outrosPerfis, emailsExtras, endereco, site e afins) e o texto
// dos pontos de revisão NÃO vão para o Firestore (decisões 5 e 8 de 21/10/2026).
//
// Idempotente por origem.chave (o id do registro no arquivo). A foto é ligada
// pela imagem já importada na etapa das imagens (origem.midiaId); sem ela, o
// campo fica vazio e o registro vai para revisão.
//
// Sem "server-only" e com o Firestore por parâmetro: roda no script
// (scripts/migrar-profissionais.mts) e nos testes no emulador. Os relatórios
// identificam cada registro pela posição no arquivo (1 a N), nunca pelo nome
// nem pelo id do arquivo (que é o nome em forma de slug).
import type { Firestore } from "firebase-admin/firestore";
import { METODOS, PAISES, UFS, type CodigoDePais, type TipoDeProfissional } from "../../config/profissionais.ts";
import { validarEmailDeContato, validarFacebook, validarInstagram, validarWhatsapp } from "../contatos.ts";
import { COLECAO_PROFISSIONAIS } from "../gravacao/profissionais.ts";
import { COLECAO_LOG, registrarNoLote } from "../log/alteracoes.ts";
import { COLECAO_MIDIAS } from "../midia/biblioteca.ts";
import type { DadosDoProfissional } from "../profissionais.ts";
import { ehIdDeDocumentoValido } from "../validacao.ts";
import { AUTOR_DA_MIGRACAO, type Modo } from "./execucao.ts";
import { ehIdDeMidiaWix } from "./imagensOrigem.ts";
import { SISTEMA_DE_ORIGEM } from "./imagens.ts";

// Tipo do arquivo para o tipo do modelo (que é também o filtro do site).
export const TIPOS_DO_ARQUIVO: Record<string, TipoDeProfissional> = {
  fisioterapeuta: "Fisioterapeutas",
  medico: "Médicos",
  ortesista: "Ortesistas",
  psicologo: "Psicólogos",
  outro: "Outros",
};

// Métodos como aparecem no arquivo para os do modelo (config/profissionais.ts).
// Tabela explícita aprovada em 21/10/2026: o que não está aqui fica de fora e
// o registro vai para revisão.
export const METODOS_DO_ARQUIVO: Record<string, (typeof METODOS)[number]> = {
  "Schroth ISST": "Schroth ISST",
  "BSPTS (Conceito Rigo)": "BSPTS Conceito Rigo",
  "BSPTS Conceito Rigo": "BSPTS Conceito Rigo",
  SEAS: "SEAS",
  "SSOL Schroth": "SSOL",
  SSOL: "SSOL",
  Lyon: "Lyon",
};

// Conselho do arquivo para o prefixo do registro (decisão de 22/10/2026: o
// campo do painel é texto livre, então o registro vai com o conselho na
// frente, ex.: "Crefito 12345"; número solto, sem conselho, não é gravado).
export const CONSELHOS_DO_ARQUIVO: Record<string, string> = { CREFITO: "Crefito", CRM: "CRM", CRP: "CRP" };

export type RegistroGravadoComo = "semRegistro" | "comoVeio" | "prefixado" | "semConselho" | "conselhoAssumido" | "longo";

// Mesmos limites do formulário do painel (lib/profissionais.ts).
const LIMITES = { tratamento: 20, nome: 120, registro: 60, cidade: 60, cidades: 10, bio: 1000, contato: 300, ordem: 999 } as const;

// Problemas que a conversão pode achar. Só os nomes vão para o relatório.
export const PROBLEMAS = [
  "tipoDesconhecido",
  "metodoSemCorrespondencia",
  "paisForaDaLista",
  "ufAusenteOuInvalida",
  "whatsappInvalido",
  "instagramInvalido",
  "facebookInvalido",
  "emailInvalido",
  "semContato",
  "semLocal",
  "cidadesInvalidas",
  "tratamentoLongo",
  "registroLongo",
  "registroSemConselho",
  "conselhoAssumido",
  "bioLonga",
  "ordemInvalida",
  "fotoDupla",
] as const;
export type Problema = (typeof PROBLEMAS)[number];

export type RegistroDeOrigem = {
  posicao: number;
  chave: string;
  bruto: Record<string, unknown>;
  fotos: string[];
  pontosDeRevisao: number;
};

// Confere a estrutura do arquivo (não o conteúdo dos campos, que a conversão
// trata um por um). Erros citam só a posição.
export function validarProfissionaisOrigem(dados: unknown): { ok: true; registros: RegistroDeOrigem[] } | { ok: false; erros: string[] } {
  if (typeof dados !== "object" || dados === null) return { ok: false, erros: ["O arquivo não é um objeto JSON."] };
  const raiz = dados as Record<string, unknown>;
  const erros: string[] = [];
  if (raiz.versao !== 1) erros.push(`versao precisa ser 1 (veio ${JSON.stringify(raiz.versao)}).`);
  if (!Array.isArray(raiz.profissionais) || raiz.profissionais.length === 0) return { ok: false, erros: [...erros, "profissionais precisa ser uma lista com pelo menos um registro."] };
  const chaves = new Set<string>();
  const registros: RegistroDeOrigem[] = [];
  raiz.profissionais.forEach((bruto: unknown, i: number) => {
    const onde = `registro ${i + 1}`;
    if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) {
      erros.push(`${onde}: não é um objeto.`);
      return;
    }
    const r = bruto as Record<string, unknown>;
    if (!ehIdDeDocumentoValido(r.id) || r.id.length > 200) erros.push(`${onde}: id ausente ou inválido.`);
    else if (chaves.has(r.id)) erros.push(`${onde}: id repetido.`);
    else chaves.add(r.id);
    if (typeof r.nome !== "string" || !r.nome.trim()) erros.push(`${onde}: nome ausente.`);
    else if (r.nome.trim().length > LIMITES.nome) erros.push(`${onde}: nome com mais de ${LIMITES.nome} caracteres.`);
    for (const campo of ["metodos", "cidades", "fotoOrigemWixId", "revisar"]) if (!Array.isArray(r[campo])) erros.push(`${onde}: ${campo} precisa ser uma lista.`);
    if (typeof r.telerreabilitacao !== "boolean") erros.push(`${onde}: telerreabilitacao precisa ser true ou false.`);
    const fotos = Array.isArray(r.fotoOrigemWixId) ? r.fotoOrigemWixId : [];
    if (fotos.some((foto) => !ehIdDeMidiaWix(foto))) erros.push(`${onde}: fotoOrigemWixId com id fora do formato do Wix.`);
    registros.push({
      posicao: i + 1,
      chave: String(r.id ?? ""),
      bruto: r,
      fotos: fotos.filter((foto): foto is string => typeof foto === "string"),
      pontosDeRevisao: Array.isArray(r.revisar) ? r.revisar.length : 0,
    });
  });
  return erros.length > 0 ? { ok: false, erros } : { ok: true, registros };
}

const textoDe = (valor: unknown) => (typeof valor === "string" ? valor.trim() : "");

// Converte um registro para os campos do modelo, com a lista de problemas.
// Cada campo que não passa fica vazio (ou na forma neutra), sem correção.
export function converterProfissional(registro: RegistroDeOrigem): { dados: DadosDoProfissional; problemas: Problema[]; registroComo: RegistroGravadoComo; conselho: string | null } {
  const r = registro.bruto;
  const problemas = new Set<Problema>();

  const tipo = TIPOS_DO_ARQUIVO[textoDe(r.tipo)];
  if (!tipo) problemas.add("tipoDesconhecido");

  let tratamento = textoDe(r.tratamento);
  if (tratamento.length > LIMITES.tratamento) {
    problemas.add("tratamentoLongo");
    tratamento = "";
  }
  // Registro: vazio fica vazio; com o nome do conselho no texto, vai como
  // veio; sem ele, ganha o conselho do arquivo na frente; sem conselho no
  // arquivo, ou com o conselho deduzido pelo tipo de profissional (nota do
  // próprio arquivo: não estava no site antigo), fica vazio e marcado (nunca
  // um número solto; decisão de 22/10/2026).
  const registroDoArquivo = textoDe(r.registro);
  const siglaDoConselho = textoDe(r.conselho).toUpperCase();
  const conselho = CONSELHOS_DO_ARQUIVO[siglaDoConselho] ?? null;
  const conselhoDeduzido = (r.revisar as unknown[]).some((ponto) => typeof ponto === "string" && /conselho assumido/i.test(ponto));
  let registroProfissional = "";
  let registroComo: RegistroGravadoComo = "semRegistro";
  if (registroDoArquivo && conselhoDeduzido) {
    problemas.add("conselhoAssumido");
    registroComo = "conselhoAssumido";
  } else if (registroDoArquivo && !conselho) {
    problemas.add("registroSemConselho");
    registroComo = "semConselho";
  } else if (registroDoArquivo && conselho) {
    const jaTemConselho = registroDoArquivo.toLowerCase().includes(siglaDoConselho.toLowerCase());
    registroProfissional = jaTemConselho ? registroDoArquivo : `${conselho} ${registroDoArquivo}`;
    registroComo = jaTemConselho ? "comoVeio" : "prefixado";
    if (registroProfissional.length > LIMITES.registro) {
      problemas.add("registroLongo");
      registroProfissional = "";
      registroComo = "longo";
    }
  }

  const metodosDoArquivo = (r.metodos as unknown[]).map(textoDe).filter(Boolean);
  const metodos = [...new Set(metodosDoArquivo.map((metodo) => METODOS_DO_ARQUIVO[metodo]).filter(Boolean))];
  if (metodosDoArquivo.some((metodo) => !METODOS_DO_ARQUIVO[metodo])) problemas.add("metodoSemCorrespondencia");

  const pais = PAISES.find((item) => item.nome === textoDe(r.pais))?.codigo;
  if (!pais) problemas.add("paisForaDaLista");

  // UF só no Brasil (como no painel).
  let uf = textoDe(r.uf).toUpperCase();
  if (pais === "BR") {
    if (!(UFS as readonly string[]).includes(uf)) {
      problemas.add("ufAusenteOuInvalida");
      uf = "";
    }
  } else uf = "";

  let cidades = [...new Set((r.cidades as unknown[]).map(textoDe).filter(Boolean))];
  if (cidades.length > LIMITES.cidades || cidades.some((cidade) => cidade.length > LIMITES.cidade)) {
    problemas.add("cidadesInvalidas");
    cidades = [];
  }
  const telerreabilitacao = r.telerreabilitacao === true;
  if (cidades.length === 0 && !telerreabilitacao) problemas.add("semLocal");

  const paisDoWhatsapp: CodigoDePais = pais ?? "BR";
  const contato = (valor: unknown, validar: (entrada: string) => { ok: true; valor: string } | { ok: false; erro: string }, problema: Problema) => {
    const resultado = validar(textoDe(valor).slice(0, LIMITES.contato));
    if (!resultado.ok) problemas.add(problema);
    return resultado.ok ? resultado.valor : "";
  };
  const whatsapp = contato(r.whatsapp, (entrada) => validarWhatsapp(entrada, paisDoWhatsapp), "whatsappInvalido");
  const instagram = contato(r.instagram, validarInstagram, "instagramInvalido");
  const facebook = contato(r.facebook, validarFacebook, "facebookInvalido");
  const email = contato(r.email, validarEmailDeContato, "emailInvalido");
  if (!whatsapp && !instagram && !facebook && !email) problemas.add("semContato");

  let bio = textoDe(r.bio);
  if (bio.length > LIMITES.bio) {
    problemas.add("bioLonga");
    bio = "";
  }

  // A ordem do arquivo é a posição na página antiga, dentro de cada tipo.
  let ordem = typeof r.ordem === "number" ? r.ordem : Number.NaN;
  if (!Number.isInteger(ordem) || ordem < 0 || ordem > LIMITES.ordem) {
    problemas.add("ordemInvalida");
    ordem = 0;
  }

  if (registro.fotos.length > 1) problemas.add("fotoDupla");

  return {
    dados: {
      tipo: tipo ?? ("" as TipoDeProfissional),
      tratamento,
      nome: textoDe(r.nome),
      registro: registroProfissional,
      metodos: METODOS.filter((metodo) => metodos.includes(metodo)),
      pais: pais ?? ("" as CodigoDePais),
      uf,
      cidades,
      telerreabilitacao,
      whatsapp,
      instagram,
      facebook,
      email,
      bio,
      ativo: false,
      ordem,
      fotoMidiaId: null,
    },
    problemas: PROBLEMAS.filter((problema) => problemas.has(problema)),
    registroComo,
    conselho: registroComo === "prefixado" ? conselho : null,
  };
}

// Imagens importadas, pelo id do Wix.
async function imagensImportadas(db: Firestore): Promise<Map<string, { id: string; naLixeira: boolean }>> {
  const documentos = await db.collection(COLECAO_MIDIAS).where("origem.sistema", "==", SISTEMA_DE_ORIGEM).select("origem", "excluidoEm").get();
  const mapa = new Map<string, { id: string; naLixeira: boolean }>();
  for (const documento of documentos.docs) {
    const midiaId = documento.get("origem.midiaId");
    if (typeof midiaId === "string") mapa.set(midiaId, { id: documento.id, naLixeira: Boolean(documento.get("excluidoEm")) });
  }
  return mapa;
}

async function jaImportados(db: Firestore): Promise<Map<string, string>> {
  const documentos = await db.collection(COLECAO_PROFISSIONAIS).where("origem.sistema", "==", SISTEMA_DE_ORIGEM).select("origem").get();
  const mapa = new Map<string, string>();
  for (const documento of documentos.docs) {
    const chave = documento.get("origem.chave");
    if (typeof chave === "string") mapa.set(chave, documento.id);
  }
  return mapa;
}

function contar(valores: string[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const valor of valores) contagem[valor] = (contagem[valor] ?? 0) + 1;
  return Object.fromEntries(Object.entries(contagem).sort(([a], [b]) => a.localeCompare(b)));
}

export const MENSAGEM_SEM_IMAGENS = "Nenhuma imagem importada do site antigo no projeto: rode antes a migração das imagens (npm run migracao:imagens). Nada foi gravado.";

export type RelatorioDeProfissionais = Awaited<ReturnType<typeof migrarProfissionais>>;

export async function migrarProfissionais(opcoes: { db: Firestore; registros: RegistroDeOrigem[]; modo: Modo; execucao: string; limite: number | null }) {
  const { db, registros, modo, execucao, limite } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const imagens = await imagensImportadas(db);
  // A execução real exige a etapa das imagens já executada (as fotos são
  // ligadas pela origem). A simulação roda mesmo sem imagens.
  if (modo === "executar" && imagens.size === 0) return { ok: false as const, mensagem: MENSAGEM_SEM_IMAGENS };

  const existentes = await jaImportados(db);
  const convertidos = registros.map((registro) => {
    const { dados, problemas, registroComo, conselho } = converterProfissional(registro);
    const primeira = registro.fotos[0] ?? null;
    const imagem = primeira ? imagens.get(primeira) : undefined;
    const foto: "ligada" | "pendente" | "naLixeira" | "semFoto" = !primeira ? "semFoto" : !imagem ? "pendente" : imagem.naLixeira ? "naLixeira" : "ligada";
    return { registro, dados: { ...dados, fotoMidiaId: foto === "ligada" ? (imagem?.id ?? null) : null }, problemas, foto, fotoWix: primeira, registroComo, conselho };
  });
  const jaExistentes = convertidos.filter((item) => existentes.has(item.registro.chave));
  const candidatos = convertidos.filter((item) => !existentes.has(item.registro.chave));
  const nestaExecucao = limite === null ? candidatos : candidatos.slice(0, limite);

  const criados: { posicao: number; profissionalId: string }[] = [];
  const falhas: { posicao: number; motivo: string }[] = [];
  if (modo === "executar") {
    for (const item of nestaExecucao) {
      // Vai para revisão quem tem ponto no arquivo, problema na conversão ou foto não ligada.
      const revisarMigracao = item.registro.pontosDeRevisao > 0 || item.problemas.length > 0 || item.foto === "pendente" || item.foto === "naLixeira";
      const referencia = db.collection(COLECAO_PROFISSIONAIS).doc();
      const agora = new Date();
      try {
        const lote = db.batch();
        lote.create(referencia, {
          ...item.dados,
          origem: { sistema: SISTEMA_DE_ORIGEM, chave: item.registro.chave, execucao },
          revisarMigracao,
          pontosDeRevisao: item.registro.pontosDeRevisao,
          criadoEm: agora,
          atualizadoEm: agora,
          excluidoEm: null,
        });
        registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, {
          colecao: COLECAO_PROFISSIONAIS,
          documentoId: referencia.id,
          acao: "criar",
          campos: [...Object.keys(item.dados), "origem", "revisarMigracao", "pontosDeRevisao"],
          resumo: "Profissional importado do site antigo.",
          origem: "migracao",
          execucao,
        });
        await lote.commit();
        criados.push({ posicao: item.registro.posicao, profissionalId: referencia.id });
      } catch (erro) {
        falhas.push({ posicao: item.registro.posicao, motivo: erro instanceof Error ? erro.message : String(erro) });
      }
    }
  }

  const fotos = (estado: string) => convertidos.filter((item) => item.foto === estado);
  const comPonto = (lista: typeof convertidos) => lista.map((item) => item.registro.posicao);
  return {
    ok: true as const,
    script: "migrar-profissionais",
    execucao,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    limite,
    contagens: {
      previstos: registros.length,
      porTipoNoArquivo: contar(registros.map((registro) => textoDe(registro.bruto.tipo) || "(vazio)")),
      porGrupoNoArquivo: contar(registros.map((registro) => textoDe(registro.bruto.grupo) || "(vazio)")),
      porPais: contar(convertidos.map((item) => item.dados.pais || "(fora da lista)")),
      // Profissionais com cada problema (um profissional conta uma vez em cada).
      porProblema: Object.fromEntries(PROBLEMAS.map((problema) => [problema, convertidos.filter((item) => item.problemas.includes(problema)).length])),
      semProblemaNaConversao: convertidos.filter((item) => item.problemas.length === 0).length,
      // Como o registro profissional seria gravado (decisão de 22/10/2026).
      registro: {
        semRegistro: convertidos.filter((item) => item.registroComo === "semRegistro").length,
        comoVeio: convertidos.filter((item) => item.registroComo === "comoVeio").length,
        prefixado: convertidos.filter((item) => item.registroComo === "prefixado").length,
        semConselho: convertidos.filter((item) => item.registroComo === "semConselho").length,
        conselhoDeduzido: convertidos.filter((item) => item.registroComo === "conselhoAssumido").length,
        longo: convertidos.filter((item) => item.registroComo === "longo").length,
        prefixadosPorConselho: contar(convertidos.filter((item) => item.conselho).map((item) => item.conselho as string)),
      },
      fotos: {
        comFotoNoArquivo: registros.filter((registro) => registro.fotos.length > 0).length,
        semFotoNoArquivo: fotos("semFoto").length,
        fotoDupla: registros.filter((registro) => registro.fotos.length > 1).length,
        seriamLigadasAgora: fotos("ligada").length,
        pendentes: fotos("pendente").length,
        naLixeira: fotos("naLixeira").length,
      },
      pontosDeRevisao: {
        total: registros.reduce((soma, registro) => soma + registro.pontosDeRevisao, 0),
        comZeroPontos: registros.filter((registro) => registro.pontosDeRevisao === 0).length,
      },
      iriamParaRevisao: convertidos.filter((item) => item.registro.pontosDeRevisao > 0 || item.problemas.length > 0 || item.foto === "pendente" || item.foto === "naLixeira").length,
      // Sem contar as fotos ainda não ligadas (na simulação, antes da migração
      // das imagens, todas as fotos aparecem como pendentes).
      iriamParaRevisaoComAsFotosLigadas: convertidos.filter((item) => item.registro.pontosDeRevisao > 0 || item.problemas.length > 0).length,
      jaExistentes: jaExistentes.length,
      candidatos: candidatos.length,
      nestaExecucao: nestaExecucao.length,
      criados: criados.length,
      falhas: falhas.length,
    },
    // Listas pela posição no arquivo (1 a N), sem nomes.
    problemasPorRegistro: convertidos.filter((item) => item.problemas.length > 0).map((item) => ({ posicao: item.registro.posicao, problemas: item.problemas })),
    fotoDupla: comPonto(convertidos.filter((item) => item.registro.fotos.length > 1)),
    semFoto: comPonto(fotos("semFoto")),
    fotosPendentes: fotos("pendente").map((item) => ({ posicao: item.registro.posicao, midiaIdWix: item.fotoWix })),
    fotosNaLixeira: fotos("naLixeira").map((item) => ({ posicao: item.registro.posicao, midiaIdWix: item.fotoWix })),
    criados,
    falhas,
  };
}

// Desfaz uma execução: só profissionais com origem.execucao igual à indicada.
// Pula o que está ligado à diretoria (profissionalId) e o que uma pessoa
// alterou depois (registro sem origem "migracao"). Com incluirEditados, os
// alterados por pessoa também saem, mas só se confirmacaoDeEditados for igual
// à quantidade deles (mostrada antes, na simulação); senão nada é apagado.
// Apaga o documento; o registro de alterações fica, com a reversão.
export async function desfazerProfissionais(opcoes: {
  db: Firestore;
  execucaoAlvo: string;
  execucao: string;
  modo: Modo;
  incluirEditados: boolean;
  confirmacaoDeEditados?: number | null;
}) {
  const { db, execucaoAlvo, execucao, modo, incluirEditados, confirmacaoDeEditados = null } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const documentos = await db.collection(COLECAO_PROFISSIONAIS).where("origem.execucao", "==", execucaoAlvo).get();
  const pulados: { profissionalId: string; motivo: string }[] = [];
  const aDesfazer: { documento: (typeof documentos.docs)[number]; editadoPorPessoa: boolean }[] = [];

  // Primeiro decide tudo; só depois apaga.
  for (const documento of documentos.docs) {
    const naDiretoria = await db.collection("diretoria").where("profissionalId", "==", documento.id).limit(1).get();
    if (!naDiretoria.empty) {
      pulados.push({ profissionalId: documento.id, motivo: "ligado à diretoria" });
      continue;
    }
    const historico = await db.collection(COLECAO_LOG).where("documentoId", "==", documento.id).get();
    const editadoPorPessoa = historico.docs.some((registro) => registro.get("origem") !== "migracao");
    if (editadoPorPessoa && !incluirEditados) {
      pulados.push({ profissionalId: documento.id, motivo: "alterado por uma pessoa depois da importação" });
      continue;
    }
    aDesfazer.push({ documento, editadoPorPessoa });
  }
  const editadosQueSairiam = aDesfazer.filter((item) => item.editadoPorPessoa).length;
  const bloqueado =
    modo === "executar" && incluirEditados && confirmacaoDeEditados !== editadosQueSairiam
      ? `Nada foi apagado: ${editadosQueSairiam} profissional(is) alterado(s) por uma pessoa sairiam. Para confirmar, repita com --confirmo-apagar-editadas=${editadosQueSairiam}.`
      : null;

  if (modo === "executar" && !bloqueado) {
    for (const { documento } of aDesfazer) {
      const lote = db.batch();
      lote.delete(documento.ref);
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, {
        colecao: COLECAO_PROFISSIONAIS,
        documentoId: documento.id,
        acao: "excluir_definitivo",
        campos: [],
        resumo: `Importação desfeita (execução ${execucaoAlvo}).`,
        origem: "migracao",
        execucao,
      });
      await lote.commit();
    }
  }
  const desfeitos = bloqueado ? [] : aDesfazer.map((item) => item.documento.id);
  return {
    script: "migrar-profissionais (desfazer)",
    execucao,
    execucaoDesfeita: execucaoAlvo,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    bloqueado,
    contagens: { encontrados: documentos.size, desfeitos: desfeitos.length, pulados: pulados.length, editadosPorPessoaQueSairiam: editadosQueSairiam },
    desfeitos,
    pulados,
  };
}

function tabela(titulo: string, contagem: Record<string, number>): string {
  return [`| ${titulo} | Quantidade |`, "|---|---|", ...Object.entries(contagem).map(([chave, valor]) => `| ${chave} | ${valor} |`)].join("\n");
}

export function relatorioDeProfissionaisEmMarkdown(relatorio: Extract<RelatorioDeProfissionais, { ok: true }>, projeto: string): string {
  const c = relatorio.contagens;
  const lista = (itens: (number | string)[]) => (itens.length ? itens.join(", ") : "nenhum");
  return [
    `# Migração dos profissionais: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
    "",
    `- Execução: ${relatorio.execucao}`,
    `- Projeto: ${projeto}`,
    `- Início: ${relatorio.iniciadoEm}; fim: ${relatorio.terminadoEm}`,
    `- Limite: ${relatorio.limite ?? "nenhum"}`,
    "- Registros identificados pela posição no profissionais.json (1 a N), sem nomes.",
    "",
    "## Contagens",
    "",
    "| Item | Quantidade |",
    "|---|---|",
    `| Previstos (registros no arquivo) | ${c.previstos} |`,
    `| Já existentes (mesma origem) | ${c.jaExistentes} |`,
    `| Candidatos | ${c.candidatos} |`,
    `| Nesta execução (depois do limite) | ${c.nestaExecucao} |`,
    `| Criados | ${c.criados} |`,
    `| Falhas | ${c.falhas} |`,
    `| Sem problema na conversão | ${c.semProblemaNaConversao} |`,
    `| Iriam para revisão hoje (revisarMigracao; foto não ligada conta) | ${c.iriamParaRevisao} |`,
    `| Iriam para revisão com as fotos ligadas | ${c.iriamParaRevisaoComAsFotosLigadas} |`,
    `| Pontos de revisão no arquivo (total) | ${c.pontosDeRevisao.total} |`,
    `| Profissionais com 0 pontos de revisão | ${c.pontosDeRevisao.comZeroPontos} |`,
    "",
    tabela("Tipo no arquivo", c.porTipoNoArquivo),
    "",
    tabela("Grupo no arquivo (não entra no modelo)", c.porGrupoNoArquivo),
    "",
    tabela("País (código do modelo)", c.porPais),
    "",
    tabela("Problema na conversão (profissionais com o problema)", c.porProblema),
    "",
    "## Registro profissional",
    "",
    "O campo do painel é texto livre (até 60 caracteres): o registro vai com o conselho na frente; sem conselho no arquivo, ou com o conselho deduzido pelo tipo, fica vazio e marcado.",
    "",
    "| Como seria gravado | Quantidade |",
    "|---|---|",
    `| Sem registro no arquivo (vazio) | ${c.registro.semRegistro} |`,
    `| Como veio (já traz o nome do conselho) | ${c.registro.comoVeio} |`,
    `| Com o conselho na frente | ${c.registro.prefixado} (${Object.entries(c.registro.prefixadosPorConselho).map(([conselho, n]) => `${conselho} ${n}`).join(", ") || "nenhum"}) |`,
    `| Sem conselho no arquivo (vazio e marcado) | ${c.registro.semConselho} |`,
    `| Acima de 60 caracteres (vazio e marcado) | ${c.registro.longo} |`,
    `| Conselho deduzido pelo tipo no arquivo (vazio e marcado) | ${c.registro.conselhoDeduzido} |`,
    "",
    "## Fotos",
    "",
    "| Item | Quantidade |",
    "|---|---|",
    `| Com foto no arquivo | ${c.fotos.comFotoNoArquivo} |`,
    `| Sem foto no arquivo | ${c.fotos.semFotoNoArquivo} |`,
    `| Com duas fotos (liga a primeira e marca revisão) | ${c.fotos.fotoDupla} |`,
    `| Seriam ligadas agora (imagem já importada) | ${c.fotos.seriamLigadasAgora} |`,
    `| Pendentes (imagem ainda não importada) | ${c.fotos.pendentes} |`,
    `| Imagem importada, mas na lixeira (não liga) | ${c.fotos.naLixeira} |`,
    "",
    `Foto dupla, posições: ${lista(relatorio.fotoDupla)}. Sem foto, posições: ${lista(relatorio.semFoto)}.`,
    "",
    "## Problemas por registro",
    "",
    relatorio.problemasPorRegistro.length
      ? ["| Posição | Problemas |", "|---|---|", ...relatorio.problemasPorRegistro.map((item) => `| ${item.posicao} | ${item.problemas.join(", ")} |`)].join("\n")
      : "Nenhum.",
    "",
    "## Falhas",
    "",
    relatorio.falhas.length ? relatorio.falhas.map((item) => `- posição ${item.posicao}: ${item.motivo}`).join("\n") : "Nenhuma.",
    "",
  ].join("\n");
}
