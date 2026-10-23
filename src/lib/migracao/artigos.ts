// Migração dos artigos do site antigo (etapa 6, degrau 5). O site antigo tem
// 4 artigos (artigo-1 a artigo-4) que são só uma imagem com links para PDFs;
// o título real está dentro da imagem e do PDF, então nada é inventado:
// título "Título a confirmar (artigo n)", categoria "A classificar" (criada
// aqui, decisão 15), rascunho, autores, link e resumo vazios e revisão
// marcada. Os 13 PDFs (8 dos artigos e 5 das cartilhas) NÃO entram: o modelo
// de PDF foi adiado (decisão 16); o relatório lista cada um.
//
// Idempotente por origem.chave (chave do artigo no mapa; "a-classificar" na
// categoria). A imagem é ligada pela imagem já importada (origem.midiaId).
// Sem "server-only" e com o Firestore por parâmetro: roda no script
// (scripts/migrar-artigos.mts) e nos testes no emulador. As partes puras são
// testadas em testes/unidade/migracao-artigos.test.mts.
import type { DocumentReference, DocumentSnapshot, Firestore } from "firebase-admin/firestore";
import { COLECAO_ARTIGOS } from "../gravacao/artigos.ts";
import { COLECAO_LOG, registrarNoLote } from "../log/alteracoes.ts";
import { escolherSlugUnico, gerarSlug } from "../slug.ts";
import { AUTOR_DA_MIGRACAO, type Modo } from "./execucao.ts";
import { SISTEMA_DE_ORIGEM, imagensImportadas } from "./imagens.ts";
import { ehIdDeMidiaWix, previstoComoRecusado, type ImagemDeOrigem } from "./imagensOrigem.ts";

export const COLECAO_CATEGORIAS_DE_ARTIGOS = "categoriasDeArtigos";
export const MENSAGEM_SEM_IMAGENS_DOS_ARTIGOS = "Nenhuma imagem importada do site antigo no projeto: rode antes a migração das imagens (npm run migracao:imagens). Nada foi gravado.";

// Categoria provisória dos artigos importados (decisão 15).
export const CATEGORIA_A_CLASSIFICAR = { chave: "a-classificar", nome: "A classificar" } as const;

export const MOTIVO_DO_PDF = "modelo de PDF adiado";

export type ArtigoDoMapa = { chave: string; numero: number; imagemNoMapa: string | null };
export type PdfDoMapa = { arquivo: string; grupo: "artigo" | "cartilha"; chave: string | null; ordem: number; motivo: typeof MOTIVO_DO_PDF };

const CHAVE_DO_ARTIGO = /^artigo-(\d{1,3})$/;
// Nome de PDF do Wix (sem host nem caminho): só letras, números, "_", "~" e ".".
const ARQUIVO_PDF = /^[0-9A-Za-z_~-]{1,120}\.pdf$/;

// Artigos e PDFs do mapa-site-antigo.jsonl. Os pares de PDFs vêm como
// [chave do artigo, primeiro PDF, segundo PDF]; os das cartilhas, numa lista.
export function lerArtigosDoMapa(conteudo: string): { ok: true; artigos: ArtigoDoMapa[]; pdfs: PdfDoMapa[] } | { ok: false; erros: string[] } {
  const artigos: ArtigoDoMapa[] = [];
  const pdfs: PdfDoMapa[] = [];
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
    if (registro.tipo === "artigo") {
      const chave = typeof registro.chave === "string" ? registro.chave.trim() : "";
      const numero = chave.match(CHAVE_DO_ARTIGO);
      if (!numero) erros.push(`Linha ${i + 1}: chave de artigo fora do formato artigo-n.`);
      else if (artigos.some((artigo) => artigo.chave === chave)) erros.push(`Linha ${i + 1}: artigo repetido (${chave}).`);
      else artigos.push({ chave, numero: Number(numero[1]), imagemNoMapa: ehIdDeMidiaWix(registro.imagem) ? registro.imagem : null });
    }
    if (registro.tipo === "artigosPdfs" && Array.isArray(registro.pares)) {
      for (const par of registro.pares) {
        if (!Array.isArray(par)) continue;
        const [chave, ...arquivos] = par;
        arquivos.forEach((arquivo: unknown, j: number) => {
          if (typeof arquivo === "string" && ARQUIVO_PDF.test(arquivo)) pdfs.push({ arquivo, grupo: "artigo", chave: typeof chave === "string" ? chave : null, ordem: j + 1, motivo: MOTIVO_DO_PDF });
          else erros.push(`Linha ${i + 1}: PDF de artigo fora do formato.`);
        });
      }
    }
    if (registro.tipo === "cartilhasPdfs" && Array.isArray(registro.arquivos)) {
      registro.arquivos.forEach((arquivo: unknown, j: number) => {
        if (typeof arquivo === "string" && ARQUIVO_PDF.test(arquivo)) pdfs.push({ arquivo, grupo: "cartilha", chave: null, ordem: j + 1, motivo: MOTIVO_DO_PDF });
        else erros.push(`Linha ${i + 1}: PDF de cartilha fora do formato.`);
      });
    }
  });
  artigos.sort((a, b) => a.numero - b.numero);
  return erros.length ? { ok: false, erros } : { ok: true, artigos, pdfs };
}

// Título provisório: o real está dentro da imagem e do PDF (não é inventado).
export function tituloProvisorio(artigo: Pick<ArtigoDoMapa, "numero">): string {
  return `Título a confirmar (artigo ${artigo.numero})`;
}

export const MOTIVOS_DE_REVISAO_DO_ARTIGO = ["tituloAConfirmar", "categoriaAClassificar", "pdfAdiado", "semImagem", "imagemPendente", "imagemRecusadaPeloTipo", "imagemDiferenteDoMapa"] as const;
export type MotivoDeRevisaoDoArtigo = (typeof MOTIVOS_DE_REVISAO_DO_ARTIGO)[number];

// Um documento conta como alterado por uma pessoa se tem registro de
// alteração fora da migração ou se atualizadoEm difere de criadoEm (o painel
// ainda não registra as edições de artigos e tópicos em logAlteracoes).
async function alteradoPorPessoa(db: Firestore, documento: DocumentSnapshot): Promise<boolean> {
  const criado = documento.get("criadoEm")?.toMillis?.();
  const atualizado = documento.get("atualizadoEm")?.toMillis?.();
  const noRegistro = (await db.collection(COLECAO_LOG).where("documentoId", "==", documento.id).get()).docs.some((registro) => registro.get("origem") !== "migracao");
  return noRegistro || criado !== atualizado;
}

function contar(valores: string[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const valor of valores) contagem[valor] = (contagem[valor] ?? 0) + 1;
  return Object.fromEntries(Object.entries(contagem).sort(([a], [b]) => a.localeCompare(b)));
}

export type RelatorioDosArtigos = Extract<Awaited<ReturnType<typeof migrarArtigos>>, { ok: true }>;

export async function migrarArtigos(opcoes: { db: Firestore; artigos: ArtigoDoMapa[]; pdfs: PdfDoMapa[]; imagensDeOrigem: ImagemDeOrigem[]; modo: Modo; execucao: string; limite: number | null }) {
  const { db, artigos, pdfs, imagensDeOrigem, modo, execucao, limite } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const imagens = await imagensImportadas(db);
  if (modo === "executar" && imagens.size === 0) return { ok: false as const, mensagem: MENSAGEM_SEM_IMAGENS_DOS_ARTIGOS };
  const idDaImagem = (midiaIdWix: string) => {
    const imagem = imagens.get(midiaIdWix);
    return imagem && !imagem.naLixeira ? imagem.id : null;
  };

  // Categoria "A classificar": a já importada (pela origem) ou uma nova.
  const categorias = (await db.collection(COLECAO_CATEGORIAS_DE_ARTIGOS).select("nome", "slug", "ordem", "origem").get()).docs;
  const daMigracao = categorias.find((documento) => documento.get("origem.sistema") === SISTEMA_DE_ORIGEM && documento.get("origem.chave") === CATEGORIA_A_CLASSIFICAR.chave);
  const conflitos: string[] = [];
  // O painel não aceita duas categorias com o mesmo nome.
  if (!daMigracao && categorias.some((documento) => gerarSlug(String(documento.get("nome") ?? "")) === gerarSlug(CATEGORIA_A_CLASSIFICAR.nome))) {
    conflitos.push(`Já existe uma categoria de artigos chamada "${CATEGORIA_A_CLASSIFICAR.nome}" que não veio da migração.`);
  }
  const slugDaCategoria = daMigracao ? String(daMigracao.get("slug") ?? "") : escolherSlugUnico(gerarSlug(CATEGORIA_A_CLASSIFICAR.nome), new Set(categorias.map((documento) => String(documento.get("slug") ?? ""))));
  // Fica por último na lista de categorias.
  const ordemDaCategoria = Math.max(0, ...categorias.map((documento) => Number(documento.get("ordem")) || 0)) + 1;

  const existentes = (await db.collection(COLECAO_ARTIGOS).where("origem.sistema", "==", SISTEMA_DE_ORIGEM).select("origem").get()).docs;
  const planos = artigos.map((artigo, i) => {
    const existente = existentes.find((documento) => documento.get("origem.chave") === artigo.chave);
    const imagemWix = imagensDeOrigem.find((imagem) => imagem.usos.some((uso) => uso.tipo === "artigo" && uso.chaveDeOrigem === artigo.chave))?.midiaIdWix ?? null;
    const imagemMidiaId = imagemWix ? idDaImagem(imagemWix) : null;
    const motivos = new Set<MotivoDeRevisaoDoArtigo>(["tituloAConfirmar", "categoriaAClassificar"]);
    if (pdfs.some((pdf) => pdf.grupo === "artigo" && pdf.chave === artigo.chave)) motivos.add("pdfAdiado");
    if (!imagemWix) motivos.add("semImagem");
    else if (!imagemMidiaId) motivos.add("imagemPendente");
    if (imagemWix && previstoComoRecusado(imagemWix)) motivos.add("imagemRecusadaPeloTipo");
    if (imagemWix && artigo.imagemNoMapa && imagemWix !== artigo.imagemNoMapa) motivos.add("imagemDiferenteDoMapa");
    const dados = {
      titulo: tituloProvisorio(artigo),
      tags: [] as string[],
      autores: "",
      link: "",
      resumo: "",
      status: "rascunho" as const,
      imagemMidiaId,
    };
    return { posicao: i + 1, artigo, existente: existente?.id ?? null, imagemWix, dados, motivos: MOTIVOS_DE_REVISAO_DO_ARTIGO.filter((motivo) => motivos.has(motivo)) };
  });
  const candidatos = planos.filter((plano) => !plano.existente);
  const nestaExecucao = limite === null ? candidatos : candidatos.slice(0, limite);
  if (modo === "executar" && conflitos.length > 0) return { ok: false as const, mensagem: `${conflitos.join(" ")} Nada foi gravado.` };

  const criados: { tipo: "categoria" | "artigo"; chave: string; id: string }[] = [];
  let idDaCategoria = daMigracao?.id ?? null;
  if (modo === "executar" && nestaExecucao.length > 0) {
    if (!idDaCategoria) {
      const referencia = db.collection(COLECAO_CATEGORIAS_DE_ARTIGOS).doc();
      const momento = new Date();
      const dados = { nome: CATEGORIA_A_CLASSIFICAR.nome, slug: slugDaCategoria, ordem: ordemDaCategoria, imagemMidiaId: null };
      const lote = db.batch();
      lote.create(referencia, { ...dados, origem: { sistema: SISTEMA_DE_ORIGEM, chave: CATEGORIA_A_CLASSIFICAR.chave, execucao }, revisarMigracao: true, criadoEm: momento, atualizadoEm: momento, excluidoEm: null });
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, {
        colecao: COLECAO_CATEGORIAS_DE_ARTIGOS,
        documentoId: referencia.id,
        acao: "criar",
        campos: [...Object.keys(dados), "origem", "revisarMigracao"],
        resumo: "Categoria provisória dos artigos importados do site antigo.",
        origem: "migracao",
        execucao,
      });
      await lote.commit();
      idDaCategoria = referencia.id;
      criados.push({ tipo: "categoria", chave: CATEGORIA_A_CLASSIFICAR.chave, id: referencia.id });
    }
    for (const plano of nestaExecucao) {
      const referencia = db.collection(COLECAO_ARTIGOS).doc();
      const momento = new Date();
      const lote = db.batch();
      lote.create(referencia, {
        ...plano.dados,
        categoria: idDaCategoria,
        origem: { sistema: SISTEMA_DE_ORIGEM, chave: plano.artigo.chave, execucao },
        revisarMigracao: true,
        criadoEm: momento,
        atualizadoEm: momento,
      });
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, {
        colecao: COLECAO_ARTIGOS,
        documentoId: referencia.id,
        acao: "criar",
        campos: [...Object.keys(plano.dados), "categoria", "origem", "revisarMigracao"],
        resumo: "Artigo importado do site antigo (rascunho, título a confirmar).",
        origem: "migracao",
        execucao,
      });
      await lote.commit();
      criados.push({ tipo: "artigo", chave: plano.artigo.chave, id: referencia.id });
    }
  }

  return {
    ok: true as const,
    script: "migrar-artigos",
    execucao,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    limite,
    contagens: {
      artigos: { previstos: artigos.length, jaExistentes: planos.filter((plano) => plano.existente).length, candidatos: candidatos.length, nestaExecucao: nestaExecucao.length, criados: criados.filter((item) => item.tipo === "artigo").length },
      categoria: { jaExistente: Boolean(daMigracao), criada: criados.some((item) => item.tipo === "categoria") },
      porStatus: contar(candidatos.map((plano) => plano.dados.status)),
      imagens: { noArquivo: planos.filter((plano) => plano.imagemWix).length, ligaveisAgora: planos.filter((plano) => plano.dados.imagemMidiaId).length },
      porMotivo: Object.fromEntries(MOTIVOS_DE_REVISAO_DO_ARTIGO.map((motivo) => [motivo, planos.filter((plano) => plano.motivos.includes(motivo)).length])),
      pdfs: { total: pdfs.length, porGrupo: contar(pdfs.map((pdf) => pdf.grupo)) },
    },
    categoria: { nome: CATEGORIA_A_CLASSIFICAR.nome, slug: slugDaCategoria, ordem: daMigracao ? Number(daMigracao.get("ordem")) || 0 : ordemDaCategoria, id: idDaCategoria },
    conflitos,
    artigos: planos.map((plano) => ({
      posicao: plano.posicao,
      chave: plano.artigo.chave,
      titulo: plano.dados.titulo,
      status: plano.dados.status,
      imagem: plano.imagemWix === null ? "sem imagem no arquivo" : plano.dados.imagemMidiaId ? "ligada" : "pendente (imagem ainda não importada)",
      motivos: plano.motivos,
      jaExistente: Boolean(plano.existente),
    })),
    pdfs,
    criados,
  };
}

// Desfaz uma execução: artigos e a categoria com origem.execucao igual à
// indicada. Pula o que uma pessoa alterou depois (com incluirEditados e a
// segunda confirmação, também saem) e a categoria ainda usada por um artigo
// que fica. Primeiro decide tudo; só depois apaga.
export async function desfazerArtigos(opcoes: { db: Firestore; execucaoAlvo: string; execucao: string; modo: Modo; incluirEditados: boolean; confirmacaoDeEditados?: number | null }) {
  const { db, execucaoAlvo, execucao, modo, incluirEditados, confirmacaoDeEditados = null } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const pulados: { colecao: string; id: string; motivo: string }[] = [];
  const aDesfazer: { colecao: string; referencia: DocumentReference; editadoPorPessoa: boolean }[] = [];

  const artigos = await db.collection(COLECAO_ARTIGOS).where("origem.execucao", "==", execucaoAlvo).get();
  const queSaem = new Set<string>();
  for (const documento of artigos.docs) {
    const editado = await alteradoPorPessoa(db, documento);
    if (editado && !incluirEditados) {
      pulados.push({ colecao: COLECAO_ARTIGOS, id: documento.id, motivo: "alterado por uma pessoa depois da importação" });
      continue;
    }
    queSaem.add(documento.id);
    aDesfazer.push({ colecao: COLECAO_ARTIGOS, referencia: documento.ref, editadoPorPessoa: editado });
  }
  const categorias = await db.collection(COLECAO_CATEGORIAS_DE_ARTIGOS).where("origem.execucao", "==", execucaoAlvo).get();
  for (const documento of categorias.docs) {
    const usadaPor = await db.collection(COLECAO_ARTIGOS).where("categoria", "==", documento.id).get();
    if (usadaPor.docs.some((artigo) => !queSaem.has(artigo.id))) {
      pulados.push({ colecao: COLECAO_CATEGORIAS_DE_ARTIGOS, id: documento.id, motivo: "usada por um artigo que fica" });
      continue;
    }
    const editado = await alteradoPorPessoa(db, documento);
    if (editado && !incluirEditados) {
      pulados.push({ colecao: COLECAO_CATEGORIAS_DE_ARTIGOS, id: documento.id, motivo: "alterada por uma pessoa depois da importação" });
      continue;
    }
    aDesfazer.push({ colecao: COLECAO_CATEGORIAS_DE_ARTIGOS, referencia: documento.ref, editadoPorPessoa: editado });
  }
  const editadosQueSairiam = aDesfazer.filter((item) => item.editadoPorPessoa).length;
  const bloqueado =
    modo === "executar" && incluirEditados && confirmacaoDeEditados !== editadosQueSairiam
      ? `Nada foi apagado: ${editadosQueSairiam} documento(s) alterado(s) por uma pessoa sairiam. Para confirmar, repita com --confirmo-apagar-editadas=${editadosQueSairiam}.`
      : null;
  if (modo === "executar" && !bloqueado) {
    for (const item of aDesfazer) {
      const lote = db.batch();
      lote.delete(item.referencia);
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, {
        colecao: item.colecao,
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
  const desfeitos = bloqueado ? [] : aDesfazer.map((item) => ({ colecao: item.colecao, id: item.referencia.id }));
  return {
    script: "migrar-artigos (desfazer)",
    execucao,
    execucaoDesfeita: execucaoAlvo,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    bloqueado,
    contagens: { encontrados: artigos.size + categorias.size, desfeitos: desfeitos.length, pulados: pulados.length, editadosPorPessoaQueSairiam: editadosQueSairiam },
    desfeitos,
    pulados,
  };
}

function tabela(titulo: string, contagem: Record<string, number>): string {
  return [`| ${titulo} | Quantidade |`, "|---|---|", ...Object.entries(contagem).map(([chave, valor]) => `| ${chave} | ${valor} |`)].join("\n");
}

const DESCRICAO_DOS_MOTIVOS: Record<MotivoDeRevisaoDoArtigo, string> = {
  tituloAConfirmar: "título a confirmar (todos)",
  categoriaAClassificar: "categoria a classificar (todos)",
  pdfAdiado: "PDF do artigo não importado (modelo de PDF adiado)",
  semImagem: "sem imagem no arquivo",
  imagemPendente: "imagem ainda não importada (ou na lixeira)",
  imagemRecusadaPeloTipo: "imagem prevista como recusada pelo tipo (GIF ou AVIF)",
  imagemDiferenteDoMapa: "imagem do imagens-origem.json diferente da do mapa",
};

export function relatorioDosArtigosEmMarkdown(relatorio: RelatorioDosArtigos, projeto: string): string {
  const c = relatorio.contagens;
  return [
    `# Migração dos artigos: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
    "",
    `- Execução: ${relatorio.execucao}`,
    `- Projeto: ${projeto}`,
    `- Início: ${relatorio.iniciadoEm}; fim: ${relatorio.terminadoEm}`,
    `- Limite: ${relatorio.limite ?? "nenhum"}`,
    `- Todos entram como rascunho, com revisarMigracao = true, na categoria "${relatorio.categoria.nome}", com autores, link, resumo e tags vazios.`,
    "",
    "## Contagens",
    "",
    "| Item | Quantidade |",
    "|---|---|",
    `| Artigos previstos | ${c.artigos.previstos} (já existentes ${c.artigos.jaExistentes}, nesta execução ${c.artigos.nestaExecucao}, criados ${c.artigos.criados}) |`,
    `| Categoria "${relatorio.categoria.nome}" | ${c.categoria.jaExistente ? "já existe" : c.categoria.criada ? "criada" : "seria criada"} (slug ${relatorio.categoria.slug}, ordem ${relatorio.categoria.ordem}) |`,
    `| Imagens | ${c.imagens.noArquivo} no arquivo; ${c.imagens.ligaveisAgora} ligáveis agora |`,
    `| PDFs não importados | ${c.pdfs.total} |`,
    "",
    tabela("Status dos novos", c.porStatus),
    "",
    tabela("Motivo de revisão", Object.fromEntries(Object.entries(c.porMotivo).map(([motivo, n]) => [DESCRICAO_DOS_MOTIVOS[motivo as MotivoDeRevisaoDoArtigo], n]))),
    "",
    relatorio.conflitos.length ? `**Conflitos:** ${relatorio.conflitos.join(" ")}` : "Sem conflito de nome com categorias existentes.",
    "",
    "## Artigos",
    "",
    "| Pos. | Chave | Título | Status | Imagem | Revisão |",
    "|---|---|---|---|---|---|",
    ...relatorio.artigos.map((artigo) => `| ${artigo.posicao} | ${artigo.chave}${artigo.jaExistente ? " (já existe)" : ""} | ${artigo.titulo} | ${artigo.status} | ${artigo.imagem} | ${artigo.motivos.join(", ")} |`),
    "",
    "## PDFs não importados",
    "",
    "| Grupo | Artigo | Ordem | Arquivo no site antigo | Motivo |",
    "|---|---|---|---|---|",
    ...relatorio.pdfs.map((pdf) => `| ${pdf.grupo} | ${pdf.chave ?? "-"} | ${pdf.ordem} | ${pdf.arquivo} | ${pdf.motivo} |`),
    "",
  ].join("\n");
}
