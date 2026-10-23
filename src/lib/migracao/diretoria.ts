// Migração da diretoria do site antigo (etapa 6, degrau 6), com o modelo
// mínimo aprovado em 22/10/2026 (decisão 9): cargo, nome, fotoMidiaId,
// periodo, ordem, profissionalId (opcional), origem, criadoEm, atualizadoEm e
// excluidoEm, mais revisarMigracao (decisão 8). O site e o painel ainda não
// leem a coleção (sem tela no painel: pendência).
//
// profissionalId só quando o nome casa EXATAMENTE (sem acento, maiúsculas e
// espaços extras) com um único profissional fora da lixeira; senão, null.
// A foto é a imagem já importada com o uso "diretoria" daquele cargo.
// Idempotente por origem.chave (a chave do cargo no mapa). Os relatórios
// identificam cada pessoa pelo cargo e pela posição, nunca pelo nome.
//
// Sem "server-only" e com o Firestore por parâmetro: roda no script
// (scripts/migrar-diretoria.mts) e nos testes no emulador. As partes puras
// são testadas em testes/unidade/migracao-diretoria.test.mts.
import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import { COLECAO_PROFISSIONAIS } from "../gravacao/profissionais.ts";
import { COLECAO_LOG, registrarNoLote } from "../log/alteracoes.ts";
import { AUTOR_DA_MIGRACAO, type Modo } from "./execucao.ts";
import { SISTEMA_DE_ORIGEM, imagensImportadas } from "./imagens.ts";
import { cargoDaDiretoria, ehIdDeMidiaWix, previstoComoRecusado, type ImagemDeOrigem } from "./imagensOrigem.ts";

export const COLECAO_DIRETORIA = "diretoria";
export const MENSAGEM_SEM_IMAGENS_DA_DIRETORIA = "Nenhuma imagem importada do site antigo no projeto: rode antes a migração das imagens (npm run migracao:imagens). Nada foi gravado.";

export type MembroDoMapa = { chave: string; nome: string; periodo: string; fotoNoMapa: string | null; ordem: number };

const PERIODO = /^\d{4}-\d{4}$/;
const CHAVE_DO_CARGO = /^[a-z]+(?:-[a-z]+)*$/;

// Membros da diretoria do mapa-site-antigo.jsonl, na ordem do mapa (a da
// página "Nossa história"). As mensagens de erro citam só a linha.
export function lerDiretoriaDoMapa(conteudo: string): { ok: true; membros: MembroDoMapa[] } | { ok: false; erros: string[] } {
  const membros: MembroDoMapa[] = [];
  const erros: string[] = [];
  conteudo.split("\n").forEach((linha, i) => {
    if (!linha.trim()) return;
    let registro: Record<string, unknown>;
    try {
      registro = JSON.parse(linha);
    } catch {
      erros.push(`Linha ${i + 1} do mapa não é JSON.`);
      return;
    }
    if (registro.tipo !== "diretoria") return;
    const chave = typeof registro.cargo === "string" ? registro.cargo.trim() : "";
    const nome = typeof registro.nome === "string" ? registro.nome.replace(/\s+/g, " ").trim() : "";
    const periodo = typeof registro.periodo === "string" ? registro.periodo.trim() : "";
    if (!CHAVE_DO_CARGO.test(chave)) erros.push(`Linha ${i + 1}: cargo fora do formato (slug).`);
    else if (membros.some((membro) => membro.chave === chave)) erros.push(`Linha ${i + 1}: cargo repetido (${chave}).`);
    if (!nome || nome.length > 120) erros.push(`Linha ${i + 1}: nome ausente ou com mais de 120 caracteres.`);
    if (!PERIODO.test(periodo)) erros.push(`Linha ${i + 1}: período fora do formato aaaa-aaaa.`);
    membros.push({ chave, nome, periodo, fotoNoMapa: ehIdDeMidiaWix(registro.foto) ? registro.foto : null, ordem: membros.length + 1 });
  });
  return erros.length ? { ok: false, erros } : { ok: true, membros };
}

// Nome para comparar: sem acento, minúsculo e com um espaço só entre as
// palavras. Nada além disso (sem tirar títulos nem abreviar).
export function nomeNormalizado(nome: string): string {
  return nome.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Id do único profissional com o mesmo nome normalizado; com nenhum ou mais
// de um, null (e o motivo).
export function profissionalPeloNome(nome: string, profissionais: { id: string; nome: string }[]): { id: string | null; casamentos: number } {
  const alvo = nomeNormalizado(nome);
  const iguais = profissionais.filter((profissional) => nomeNormalizado(profissional.nome) === alvo);
  return { id: iguais.length === 1 ? iguais[0].id : null, casamentos: iguais.length };
}

export const MOTIVOS_DE_REVISAO_DA_DIRETORIA = ["semFoto", "fotoPendente", "fotoRecusadaPeloTipo", "fotoDiferenteDoMapa", "cargoDesconhecido", "nomeComMaisDeUmProfissional"] as const;
export type MotivoDeRevisaoDaDiretoria = (typeof MOTIVOS_DE_REVISAO_DA_DIRETORIA)[number];

function contar(valores: string[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const valor of valores) contagem[valor] = (contagem[valor] ?? 0) + 1;
  return Object.fromEntries(Object.entries(contagem).sort(([a], [b]) => a.localeCompare(b)));
}

export type RelatorioDaDiretoria = Extract<Awaited<ReturnType<typeof migrarDiretoria>>, { ok: true }>;

// nomesDoArquivoDeProfissionais: só para a simulação prever quantos casariam
// depois da migração dos profissionais (o relatório mostra só a contagem).
export async function migrarDiretoria(opcoes: {
  db: Firestore;
  membros: MembroDoMapa[];
  imagensDeOrigem: ImagemDeOrigem[];
  nomesDoArquivoDeProfissionais?: string[];
  modo: Modo;
  execucao: string;
  limite: number | null;
}) {
  const { db, membros, imagensDeOrigem, nomesDoArquivoDeProfissionais = [], modo, execucao, limite } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const imagens = await imagensImportadas(db);
  if (modo === "executar" && imagens.size === 0) return { ok: false as const, mensagem: MENSAGEM_SEM_IMAGENS_DA_DIRETORIA };
  const idDaImagem = (midiaIdWix: string) => {
    const imagem = imagens.get(midiaIdWix);
    return imagem && !imagem.naLixeira ? imagem.id : null;
  };

  const profissionais = (await db.collection(COLECAO_PROFISSIONAIS).select("nome", "excluidoEm").get()).docs
    .filter((documento) => !documento.get("excluidoEm"))
    .map((documento) => ({ id: documento.id, nome: String(documento.get("nome") ?? "") }));
  const doArquivo = nomesDoArquivoDeProfissionais.map((nome, i) => ({ id: String(i), nome }));
  const existentes = (await db.collection(COLECAO_DIRETORIA).where("origem.sistema", "==", SISTEMA_DE_ORIGEM).select("origem").get()).docs;

  const planos = membros.map((membro) => {
    const existente = existentes.find((documento) => documento.get("origem.chave") === membro.chave);
    const fotoWix = imagensDeOrigem.find((imagem) => imagem.usos.some((uso) => uso.tipo === "diretoria" && uso.chaveDeOrigem === membro.chave))?.midiaIdWix ?? null;
    const fotoMidiaId = fotoWix ? idDaImagem(fotoWix) : null;
    const cargo = cargoDaDiretoria(membro.chave);
    const profissional = profissionalPeloNome(membro.nome, profissionais);
    const motivos = new Set<MotivoDeRevisaoDaDiretoria>();
    if (!fotoWix) motivos.add("semFoto");
    else if (!fotoMidiaId) motivos.add("fotoPendente");
    if (fotoWix && previstoComoRecusado(fotoWix)) motivos.add("fotoRecusadaPeloTipo");
    if (fotoWix && membro.fotoNoMapa && fotoWix !== membro.fotoNoMapa) motivos.add("fotoDiferenteDoMapa");
    if (!cargo) motivos.add("cargoDesconhecido");
    if (profissional.casamentos > 1) motivos.add("nomeComMaisDeUmProfissional");
    const dados = { cargo: cargo ?? "", nome: membro.nome, fotoMidiaId, periodo: membro.periodo, ordem: membro.ordem, profissionalId: profissional.id };
    return {
      membro,
      existente: existente?.id ?? null,
      fotoWix,
      dados,
      casaComOArquivo: profissionalPeloNome(membro.nome, doArquivo).casamentos === 1,
      motivos: MOTIVOS_DE_REVISAO_DA_DIRETORIA.filter((motivo) => motivos.has(motivo)),
    };
  });
  const candidatos = planos.filter((plano) => !plano.existente);
  const nestaExecucao = limite === null ? candidatos : candidatos.slice(0, limite);

  const criados: { chave: string; id: string }[] = [];
  if (modo === "executar") {
    for (const plano of nestaExecucao) {
      const referencia = db.collection(COLECAO_DIRETORIA).doc();
      const momento = new Date();
      const lote = db.batch();
      lote.create(referencia, {
        ...plano.dados,
        origem: { sistema: SISTEMA_DE_ORIGEM, chave: plano.membro.chave, execucao },
        // Todos vão para revisão: cargo, período e foto vêm do site antigo.
        revisarMigracao: true,
        criadoEm: momento,
        atualizadoEm: momento,
        excluidoEm: null,
      });
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, {
        colecao: COLECAO_DIRETORIA,
        documentoId: referencia.id,
        acao: "criar",
        campos: [...Object.keys(plano.dados), "origem", "revisarMigracao"],
        resumo: "Membro da diretoria importado do site antigo.",
        origem: "migracao",
        execucao,
      });
      await lote.commit();
      criados.push({ chave: plano.membro.chave, id: referencia.id });
    }
  }

  return {
    ok: true as const,
    script: "migrar-diretoria",
    execucao,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    limite,
    contagens: {
      previstos: membros.length,
      jaExistentes: planos.filter((plano) => plano.existente).length,
      candidatos: candidatos.length,
      nestaExecucao: nestaExecucao.length,
      criados: criados.length,
      porPeriodo: contar(planos.map((plano) => plano.dados.periodo)),
      fotos: { noArquivo: planos.filter((plano) => plano.fotoWix).length, ligaveisAgora: planos.filter((plano) => plano.dados.fotoMidiaId).length },
      profissionalLigadoAgora: planos.filter((plano) => plano.dados.profissionalId).length,
      casariamComOArquivoDeProfissionais: planos.filter((plano) => plano.casaComOArquivo).length,
      porMotivo: Object.fromEntries(MOTIVOS_DE_REVISAO_DA_DIRETORIA.map((motivo) => [motivo, planos.filter((plano) => plano.motivos.includes(motivo)).length])),
    },
    // Sem nomes: cada pessoa pelo cargo e pela posição.
    membros: planos.map((plano) => ({
      ordem: plano.membro.ordem,
      chave: plano.membro.chave,
      cargo: plano.dados.cargo,
      periodo: plano.dados.periodo,
      foto: plano.fotoWix === null ? "sem foto no arquivo" : plano.dados.fotoMidiaId ? "ligada" : "pendente (imagem ainda não importada)",
      profissional: plano.dados.profissionalId ? "ligado" : plano.casaComOArquivo ? "casaria depois da migração dos profissionais" : "sem profissional com o mesmo nome",
      motivos: plano.motivos,
      jaExistente: Boolean(plano.existente),
    })),
    criados,
  };
}

// Desfaz uma execução: os membros com origem.execucao igual à indicada. Pula
// o que uma pessoa alterou depois (registro fora da migração ou atualizadoEm
// diferente de criadoEm); com incluirEditados e a segunda confirmação,
// também saem. Primeiro decide tudo; só depois apaga.
export async function desfazerDiretoria(opcoes: { db: Firestore; execucaoAlvo: string; execucao: string; modo: Modo; incluirEditados: boolean; confirmacaoDeEditados?: number | null }) {
  const { db, execucaoAlvo, execucao, modo, incluirEditados, confirmacaoDeEditados = null } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const pulados: { id: string; motivo: string }[] = [];
  const aDesfazer: { referencia: DocumentReference; editadoPorPessoa: boolean }[] = [];
  const documentos = await db.collection(COLECAO_DIRETORIA).where("origem.execucao", "==", execucaoAlvo).get();
  for (const documento of documentos.docs) {
    const criado = documento.get("criadoEm")?.toMillis?.();
    const atualizado = documento.get("atualizadoEm")?.toMillis?.();
    const noRegistro = (await db.collection(COLECAO_LOG).where("documentoId", "==", documento.id).get()).docs.some((registro) => registro.get("origem") !== "migracao");
    const editado = noRegistro || criado !== atualizado;
    if (editado && !incluirEditados) {
      pulados.push({ id: documento.id, motivo: "alterado por uma pessoa depois da importação" });
      continue;
    }
    aDesfazer.push({ referencia: documento.ref, editadoPorPessoa: editado });
  }
  const editadosQueSairiam = aDesfazer.filter((item) => item.editadoPorPessoa).length;
  const bloqueado =
    modo === "executar" && incluirEditados && confirmacaoDeEditados !== editadosQueSairiam
      ? `Nada foi apagado: ${editadosQueSairiam} membro(s) da diretoria alterado(s) por uma pessoa sairiam. Para confirmar, repita com --confirmo-apagar-editadas=${editadosQueSairiam}.`
      : null;
  if (modo === "executar" && !bloqueado) {
    for (const item of aDesfazer) {
      const lote = db.batch();
      lote.delete(item.referencia);
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, {
        colecao: COLECAO_DIRETORIA,
        documentoId: item.referencia.id,
        acao: "excluir_definitivo",
        campos: [],
        resumo: `Importação desfeita (execução ${execucaoAlvo}).`,
        origem: "migracao",
        execucao,
      });
      await lote.commit();
    }
  }
  const desfeitos = bloqueado ? [] : aDesfazer.map((item) => item.referencia.id);
  return {
    script: "migrar-diretoria (desfazer)",
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

const DESCRICAO_DOS_MOTIVOS: Record<MotivoDeRevisaoDaDiretoria, string> = {
  semFoto: "sem foto no arquivo",
  fotoPendente: "foto ainda não importada (ou na lixeira)",
  fotoRecusadaPeloTipo: "foto prevista como recusada pelo tipo (GIF ou AVIF)",
  fotoDiferenteDoMapa: "foto do imagens-origem.json diferente da do mapa",
  cargoDesconhecido: "cargo sem nome conhecido (campo vazio)",
  nomeComMaisDeUmProfissional: "nome igual ao de mais de um profissional (sem ligação)",
};

export function relatorioDaDiretoriaEmMarkdown(relatorio: RelatorioDaDiretoria, projeto: string): string {
  const c = relatorio.contagens;
  return [
    `# Migração da diretoria: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
    "",
    `- Execução: ${relatorio.execucao}`,
    `- Projeto: ${projeto}`,
    `- Início: ${relatorio.iniciadoEm}; fim: ${relatorio.terminadoEm}`,
    `- Limite: ${relatorio.limite ?? "nenhum"}`,
    "- Todos entram com revisarMigracao = true. Sem tela no painel nem página no site (pendência). Pessoas identificadas pelo cargo, sem nome.",
    "",
    "## Contagens",
    "",
    "| Item | Quantidade |",
    "|---|---|",
    `| Previstos | ${c.previstos} (já existentes ${c.jaExistentes}, nesta execução ${c.nestaExecucao}, criados ${c.criados}) |`,
    `| Fotos | ${c.fotos.noArquivo} no arquivo; ${c.fotos.ligaveisAgora} ligáveis agora |`,
    `| Ligados a um profissional agora | ${c.profissionalLigadoAgora} |`,
    `| Casariam com um profissional do profissionais.json (nome exato) | ${c.casariamComOArquivoDeProfissionais} |`,
    "",
    tabela("Período", c.porPeriodo),
    "",
    tabela("Motivo de revisão", Object.fromEntries(Object.entries(c.porMotivo).map(([motivo, n]) => [DESCRICAO_DOS_MOTIVOS[motivo as MotivoDeRevisaoDaDiretoria], n]))),
    "",
    "## Membros",
    "",
    "| Ordem | Chave | Cargo | Período | Foto | Profissional | Revisão |",
    "|---|---|---|---|---|---|---|",
    ...relatorio.membros.map((membro) => `| ${membro.ordem} | ${membro.chave}${membro.jaExistente ? " (já existe)" : ""} | ${membro.cargo || "(vazio)"} | ${membro.periodo} | ${membro.foto} | ${membro.profissional} | ${membro.motivos.join(", ") || "-"} |`),
    "",
  ].join("\n");
}
