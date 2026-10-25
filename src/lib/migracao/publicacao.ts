// Publicação do conteúdo importado do site antigo (etapa 6, exceção decidida
// em 24/10/2026): liga a visibilidade dos documentos que vieram da migração
// (origem.sistema "wix"), sem a conferência de menores das imagens e sem a
// revisão dos pontos marcados. A base da decisão é que tudo já estava público
// no site antigo. conferenciaDeMenor e revisarMigracao NÃO mudam.
//
// O que liga, por tipo:
//   profissionais  ativo = true
//   produtos       publicado = true (a loja continua sem pagamento)
//   posts          status "publicado" (publicadoEm original, sem mudança)
//   artigos        status "publicado" e publicadoEm = agora (não tinham)
//   diretoria      ativo = true
//   categorias     categoria de artigo com ativa = true; as categorias de
//                  produto não têm campo de visibilidade (aparecem quando têm
//                  produto publicado) e só são contadas
//
// atualizadoEm NÃO é tocado: os scripts de importação usam atualizadoEm
// diferente de criadoEm para reconhecer o documento alterado por uma pessoa,
// e o desfazer deles continuaria certo. Cada documento publicado ganha uma
// linha "editar" em logAlteracoes (usuarioId "migracao", papel "sistema",
// origem "migracao", com a execução); é por essas linhas que o desfazer acha
// o que a execução ligou.
//
// Sem "server-only" e com o Firestore por parâmetro: roda no script
// (scripts/publicar-migracao.mts) e nos testes no emulador. As partes puras
// são testadas em testes/unidade/migracao-publicacao.test.mts.
import { FieldValue, type DocumentData, type DocumentSnapshot, type Firestore } from "firebase-admin/firestore";
import { COLECAO_ARTIGOS } from "../gravacao/artigos.ts";
import { COLECAO_POSTS } from "../gravacao/posts.ts";
import { COLECAO_PRODUTOS } from "../gravacao/produtos.ts";
import { COLECAO_PROFISSIONAIS } from "../gravacao/profissionais.ts";
import { COLECAO_LOG, registrarNoLote } from "../log/alteracoes.ts";
import { COLECAO_CATEGORIAS_DE_ARTIGOS } from "./artigos.ts";
import { COLECAO_DIRETORIA } from "./diretoria.ts";
import { AUTOR_DA_MIGRACAO, type Modo } from "./execucao.ts";
import { SISTEMA_DE_ORIGEM } from "./imagens.ts";
import { COLECAO_CATEGORIAS_DE_PRODUTOS } from "./produtos.ts";

export const TIPOS_DE_PUBLICACAO = ["profissionais", "produtos", "posts", "artigos", "diretoria", "categorias"] as const;
export type TipoDePublicacao = (typeof TIPOS_DE_PUBLICACAO)[number];

export const RESUMO_DA_PUBLICACAO = "Publicado no site pela exceção de 24/10/2026 (sem conferência de menores e sem revisão da migração).";

// --tipo é obrigatório: "todos" ou um ou mais tipos separados por vírgula
// (ex.: --tipo=profissionais,produtos), na ordem de TIPOS_DE_PUBLICACAO.
export function lerTiposDePublicacao(valor: string | null): { ok: true; tipos: TipoDePublicacao[] } | { ok: false; mensagem: string } {
  const opcoes = [...TIPOS_DE_PUBLICACAO, "todos"].join("|");
  if (valor === null) return { ok: false, mensagem: `Escolha o que publicar com --tipo=${opcoes} (vários separados por vírgula).` };
  if (valor === "todos") return { ok: true, tipos: [...TIPOS_DE_PUBLICACAO] };
  const pedidos = valor.split(",").map((parte) => parte.trim());
  if (pedidos.some((parte) => !(TIPOS_DE_PUBLICACAO as readonly string[]).includes(parte))) return { ok: false, mensagem: `--tipo desconhecido. Use --tipo=${opcoes} (vários separados por vírgula).` };
  return { ok: true, tipos: TIPOS_DE_PUBLICACAO.filter((tipo) => pedidos.includes(tipo)) };
}

// Regra de cada coleção: quando o documento já está no ar, o que gravar para
// publicar e o que gravar para voltar (a partir dos campos que a publicação
// gravou, registrados no logAlteracoes).
export type RegraDePublicacao = {
  tipo: TipoDePublicacao;
  colecao: string;
  estaNoAr: (dados: DocumentData) => boolean;
  // null: a coleção não tem campo de visibilidade (só é contada).
  camposParaPublicar: ((dados: DocumentData, agora: Date) => Record<string, unknown>) | null;
  camposParaDesfazer: (campos: string[]) => Record<string, unknown>;
};

export const REGRAS_DE_PUBLICACAO: readonly RegraDePublicacao[] = [
  {
    tipo: "profissionais",
    colecao: COLECAO_PROFISSIONAIS,
    estaNoAr: (dados) => dados.ativo === true,
    camposParaPublicar: () => ({ ativo: true }),
    camposParaDesfazer: () => ({ ativo: false }),
  },
  {
    tipo: "produtos",
    colecao: COLECAO_PRODUTOS,
    estaNoAr: (dados) => dados.publicado === true,
    camposParaPublicar: () => ({ publicado: true }),
    camposParaDesfazer: () => ({ publicado: false }),
  },
  {
    tipo: "posts",
    colecao: COLECAO_POSTS,
    estaNoAr: (dados) => dados.status === "publicado",
    camposParaPublicar: () => ({ status: "publicado" }),
    camposParaDesfazer: () => ({ status: "rascunho" }),
  },
  {
    tipo: "artigos",
    colecao: COLECAO_ARTIGOS,
    estaNoAr: (dados) => dados.status === "publicado",
    // A data de publicação só entra quando o artigo não tem uma.
    camposParaPublicar: (dados, agora) => ({ status: "publicado", ...(dados.publicadoEm ? {} : { publicadoEm: agora }) }),
    camposParaDesfazer: (campos) => ({ status: "rascunho", ...(campos.includes("publicadoEm") ? { publicadoEm: FieldValue.delete() } : {}) }),
  },
  {
    tipo: "diretoria",
    colecao: COLECAO_DIRETORIA,
    estaNoAr: (dados) => dados.ativo === true,
    camposParaPublicar: () => ({ ativo: true }),
    camposParaDesfazer: () => ({ ativo: false }),
  },
  {
    tipo: "categorias",
    colecao: COLECAO_CATEGORIAS_DE_ARTIGOS,
    // Ausente vale ativa (lib/topicos.ts); só false esconde.
    estaNoAr: (dados) => dados.ativa !== false,
    camposParaPublicar: () => ({ ativa: true }),
    camposParaDesfazer: () => ({ ativa: false }),
  },
  {
    tipo: "categorias",
    colecao: COLECAO_CATEGORIAS_DE_PRODUTOS,
    estaNoAr: () => true,
    camposParaPublicar: null,
    camposParaDesfazer: () => ({}),
  },
];

export type SituacaoNaPublicacao = "aPublicar" | "jaNoAr" | "naLixeira" | "semCampo";

// Situação de um documento importado diante da publicação.
export function situacaoNaPublicacao(regra: RegraDePublicacao, dados: DocumentData): SituacaoNaPublicacao {
  if (dados.excluidoEm) return "naLixeira";
  if (regra.camposParaPublicar === null) return "semCampo";
  return regra.estaNoAr(dados) ? "jaNoAr" : "aPublicar";
}

const TITULO_A_CONFIRMAR = /^Título a confirmar \(artigo \d+\)$/;
const IMAGEM_PENDENTE_NO_TEXTO = /\]\(midia:wix:/;

// Avisos do relatório (só contagens e ids): o que vai ao ar sem imagem, com
// título provisório ou sem data. A página nunca mostra o marcador midia:wix
// (a imagem sem documento em midias fica fora da página).
export function avisosDoDocumento(colecao: string, dados: DocumentData): string[] {
  const avisos: string[] = [];
  const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");
  if (colecao === COLECAO_PROFISSIONAIS && !dados.fotoMidiaId) avisos.push("semFoto");
  if (colecao === COLECAO_DIRETORIA && !dados.fotoMidiaId) avisos.push("semFoto");
  if (colecao === COLECAO_PRODUTOS && !(Array.isArray(dados.imagens) && dados.imagens.length > 0)) avisos.push("semImagem");
  if (colecao === COLECAO_POSTS) {
    if (!dados.capaMidiaId) avisos.push("semCapa");
    if (IMAGEM_PENDENTE_NO_TEXTO.test(texto(dados.conteudo))) avisos.push("imagemPendenteNoTexto");
    if (!dados.publicadoEm) avisos.push("semDataDePublicacao");
  }
  if (colecao === COLECAO_ARTIGOS) {
    if (TITULO_A_CONFIRMAR.test(texto(dados.titulo))) avisos.push("tituloAConfirmar");
    if (!dados.imagemMidiaId) avisos.push("semImagem");
    if (!texto(dados.autores)) avisos.push("semAutores");
  }
  return avisos;
}

function contar(valores: string[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const valor of valores) contagem[valor] = (contagem[valor] ?? 0) + 1;
  return Object.fromEntries(Object.entries(contagem).sort(([a], [b]) => a.localeCompare(b)));
}

export type RelatorioDaPublicacao = Awaited<ReturnType<typeof publicarMigracao>>;

export async function publicarMigracao(opcoes: { db: Firestore; tipos: TipoDePublicacao[]; modo: Modo; execucao: string; limite: number | null }) {
  const { db, tipos, modo, execucao, limite } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const regras = REGRAS_DE_PUBLICACAO.filter((regra) => tipos.includes(regra.tipo));
  let restantes = limite ?? Number.POSITIVE_INFINITY;

  const colecoes = [];
  for (const regra of regras) {
    const todos = await db.collection(regra.colecao).get();
    const importados = todos.docs.filter((documento) => documento.get("origem.sistema") === SISTEMA_DE_ORIGEM);
    const situacoes = importados.map((documento) => ({ documento, situacao: situacaoNaPublicacao(regra, documento.data()) }));
    const aPublicar = situacoes.filter((item) => item.situacao === "aPublicar").map((item) => item.documento);
    const nestaExecucao = aPublicar.slice(0, Math.max(0, Math.min(aPublicar.length, restantes)));
    restantes -= nestaExecucao.length;

    const publicados: string[] = [];
    if (modo === "executar" && regra.camposParaPublicar) {
      for (const documento of nestaExecucao) {
        const campos = regra.camposParaPublicar(documento.data(), new Date());
        const lote = db.batch();
        // A gravação só vale se o documento não mudou desde a leitura.
        lote.update(documento.ref, campos, { lastUpdateTime: documento.updateTime });
        registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, {
          colecao: regra.colecao,
          documentoId: documento.id,
          acao: "editar",
          campos: Object.keys(campos),
          resumo: RESUMO_DA_PUBLICACAO,
          origem: "migracao",
          execucao,
        });
        await lote.commit();
        publicados.push(documento.id);
      }
    }

    // Os avisos valem para o que fica no ar ao fim da execução (o publicado
    // agora e o que já estava).
    const noAr = situacoes.filter((item) => item.situacao === "jaNoAr" || item.situacao === "semCampo" || nestaExecucao.includes(item.documento));
    colecoes.push({
      tipo: regra.tipo,
      colecao: regra.colecao,
      contagens: {
        total: todos.size,
        foraDaMigracao: todos.size - importados.length,
        importados: importados.length,
        aPublicar: aPublicar.length,
        nestaExecucao: nestaExecucao.length,
        publicados: publicados.length,
        jaNoAr: situacoes.filter((item) => item.situacao === "jaNoAr").length,
        semCampoDeVisibilidade: situacoes.filter((item) => item.situacao === "semCampo").length,
        naLixeira: situacoes.filter((item) => item.situacao === "naLixeira").length,
        paraRevisar: importados.filter((documento) => documento.get("revisarMigracao") === true).length,
        avisos: contar(noAr.flatMap((item) => avisosDoDocumento(regra.colecao, item.documento.data()))),
      },
      // Só ids.
      idsAPublicar: nestaExecucao.map((documento) => documento.id),
      idsNaLixeira: situacoes.filter((item) => item.situacao === "naLixeira").map((item) => item.documento.id),
      idsComAviso: Object.fromEntries(
        [...new Set(noAr.flatMap((item) => avisosDoDocumento(regra.colecao, item.documento.data())))].map((aviso) => [
          aviso,
          noAr.filter((item) => avisosDoDocumento(regra.colecao, item.documento.data()).includes(aviso)).map((item) => item.documento.id),
        ]),
      ),
      publicados,
    });
  }

  return { script: "publicar-migracao", execucao, modo, iniciadoEm, terminadoEm: new Date().toISOString(), tipos, limite, colecoes };
}

// Decide se um documento publicado por uma execução pode voltar. Pula o que
// não existe mais, o que já não está no ar (alguém mudou) e o que uma pessoa
// alterou depois da publicação (registro fora da migração ou atualizadoEm
// posterior: posts e artigos ainda não registram as edições do painel).
export function decidirDesfazer(opcoes: {
  regra: RegraDePublicacao;
  dados: DocumentData | undefined;
  publicadoEm: number | null;
  registrosDePessoaEm: number[];
}): { ok: true } | { ok: false; motivo: string } {
  const { regra, dados, publicadoEm, registrosDePessoaEm } = opcoes;
  if (!dados) return { ok: false, motivo: "documento não existe mais" };
  if (!regra.estaNoAr(dados)) return { ok: false, motivo: "já não está no ar" };
  if (publicadoEm === null) return { ok: false, motivo: "registro da publicação sem data" };
  const atualizado = typeof dados.atualizadoEm?.toMillis === "function" ? dados.atualizadoEm.toMillis() : null;
  if (registrosDePessoaEm.some((momento) => momento > publicadoEm) || (atualizado !== null && atualizado > publicadoEm)) {
    return { ok: false, motivo: "alterado por uma pessoa depois da publicação" };
  }
  return { ok: true };
}

// Desfaz uma execução da publicação: volta os campos que ela gravou ao valor
// de antes (rascunho, ativo/publicado/ativa false, sem publicadoEm nos
// artigos que não tinham). Primeiro decide tudo; só depois grava.
export async function desfazerPublicacao(opcoes: { db: Firestore; execucaoAlvo: string; execucao: string; modo: Modo }) {
  const { db, execucaoAlvo, execucao, modo } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const registros = (await db.collection(COLECAO_LOG).where("execucao", "==", execucaoAlvo).get()).docs.filter(
    (registro) => registro.get("origem") === "migracao" && registro.get("acao") === "editar" && registro.get("resumo") === RESUMO_DA_PUBLICACAO,
  );
  const aDesfazer: { regra: RegraDePublicacao; documento: DocumentSnapshot; campos: string[] }[] = [];
  const pulados: { colecao: string; id: string; motivo: string }[] = [];
  for (const registro of registros) {
    const colecao = String(registro.get("colecao"));
    const id = String(registro.get("documentoId"));
    const regra = REGRAS_DE_PUBLICACAO.find((item) => item.colecao === colecao && item.camposParaPublicar !== null);
    if (!regra) {
      pulados.push({ colecao, id, motivo: "coleção fora da publicação" });
      continue;
    }
    const documento = await db.collection(colecao).doc(id).get();
    const publicadoEm = registro.get("criadoEm")?.toMillis?.() ?? null;
    const registrosDePessoaEm = (await db.collection(COLECAO_LOG).where("documentoId", "==", id).get()).docs
      .filter((outro) => outro.get("origem") !== "migracao")
      .map((outro) => outro.get("criadoEm")?.toMillis?.() ?? Number.POSITIVE_INFINITY);
    const decisao = decidirDesfazer({ regra, dados: documento.data(), publicadoEm, registrosDePessoaEm });
    if (!decisao.ok) {
      pulados.push({ colecao, id, motivo: decisao.motivo });
      continue;
    }
    aDesfazer.push({ regra, documento, campos: (registro.get("campos") as string[] | undefined) ?? [] });
  }

  const desfeitos: { colecao: string; id: string }[] = [];
  if (modo === "executar") {
    for (const item of aDesfazer) {
      const lote = db.batch();
      lote.update(item.documento.ref, item.regra.camposParaDesfazer(item.campos), { lastUpdateTime: item.documento.updateTime });
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, {
        colecao: item.regra.colecao,
        documentoId: item.documento.id,
        acao: "editar",
        campos: item.campos,
        resumo: `Publicação desfeita (execução ${execucaoAlvo}).`,
        origem: "migracao",
        execucao,
      });
      await lote.commit();
      desfeitos.push({ colecao: item.regra.colecao, id: item.documento.id });
    }
  }

  return {
    script: "publicar-migracao (desfazer)",
    execucao,
    execucaoDesfeita: execucaoAlvo,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    contagens: {
      encontrados: registros.length,
      aDesfazer: aDesfazer.length,
      desfeitos: desfeitos.length,
      pulados: pulados.length,
      porColecao: contar(aDesfazer.map((item) => item.regra.colecao)),
    },
    desfeitos,
    pulados,
  };
}

const DESCRICAO_DOS_AVISOS: Record<string, string> = {
  semFoto: "sem foto (placeholder)",
  semImagem: "sem imagem (placeholder ou sem bloco de imagem)",
  semCapa: "sem capa (placeholder na lista, sem capa na página)",
  imagemPendenteNoTexto: "imagem do texto ainda pendente (midia:wix; fica fora da página)",
  semDataDePublicacao: "sem data de publicação original (vale a data de criação)",
  tituloAConfirmar: "título provisório \"Título a confirmar (artigo n)\" VISÍVEL no site",
  semAutores: "sem autores (o site mostra \"Autor Desconhecido\")",
};

export function relatorioDaPublicacaoEmMarkdown(relatorio: RelatorioDaPublicacao, projeto: string): string {
  const linhas = [
    `# Publicação do conteúdo importado: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
    "",
    `- Execução: ${relatorio.execucao}`,
    `- Projeto: ${projeto}`,
    `- Tipos: ${relatorio.tipos.join(", ")}`,
    `- Início: ${relatorio.iniciadoEm}; fim: ${relatorio.terminadoEm}`,
    `- Limite: ${relatorio.limite ?? "nenhum"}`,
    "- Exceção decidida em 24/10/2026: publicar sem a conferência de menores (conferenciaDeMenor continua \"pendente\") e sem revisar os pontos de revisão (revisarMigracao continua true). Base: o conteúdo já era público no site antigo.",
    "- Só documentos com origem da migração. atualizadoEm não muda. Só ids e contagens neste relatório.",
    `- Desfazer: npm run migracao:publicar -- --desfazer --execucao=${relatorio.execucao} (simula) e o mesmo com --executar --confirmo-projeto=${projeto} (grava).`,
    "",
    "## Contagens",
    "",
    "| Coleção | Total | Fora da migração | Importados | A publicar | Nesta execução | Publicados | Já no ar | Sem campo de visibilidade | Na lixeira | Para revisar |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
    ...relatorio.colecoes.map((item) => {
      const c = item.contagens;
      return `| ${item.colecao} | ${c.total} | ${c.foraDaMigracao} | ${c.importados} | ${c.aPublicar} | ${c.nestaExecucao} | ${c.publicados} | ${c.jaNoAr} | ${c.semCampoDeVisibilidade} | ${c.naLixeira} | ${c.paraRevisar} |`;
    }),
    "",
    "## Avisos (no que fica no ar)",
    "",
  ];
  for (const item of relatorio.colecoes) {
    const avisos = Object.entries(item.idsComAviso);
    if (avisos.length === 0) continue;
    linhas.push(`### ${item.colecao}`, "");
    for (const [aviso, ids] of avisos) linhas.push(`- ${DESCRICAO_DOS_AVISOS[aviso] ?? aviso}: ${ids.length} (${ids.join(", ")})`);
    linhas.push("");
  }
  if (relatorio.colecoes.some((item) => item.colecao === COLECAO_CATEGORIAS_DE_PRODUTOS)) {
    linhas.push("Categorias de produto não têm campo de visibilidade: aparecem nos filtros de /loja quando têm produto publicado.", "");
  }
  if (relatorio.colecoes.some((item) => item.colecao === COLECAO_ARTIGOS)) {
    linhas.push("Os 13 PDFs do site antigo continuam fora (modelo de PDF adiado).", "");
  }
  linhas.push("## Ids publicados nesta execução", "");
  for (const item of relatorio.colecoes) linhas.push(`- ${item.colecao}: ${item.publicados.length ? item.publicados.join(", ") : "nenhum"}`);
  linhas.push("");
  return linhas.join("\n");
}
