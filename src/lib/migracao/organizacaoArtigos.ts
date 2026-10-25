// Organização dos 4 artigos importados (25/10/2026): grava o título e os
// autores que estão ESCRITOS na imagem de cada artigo (lidos por uma pessoa
// e guardados em docs/dados-privados/artigos-titulos.json, fora do Git),
// cria a categoria "Artigos científicos" (ativa) e passa os artigos de
// "A classificar" para ela, deixando "A classificar" com ativa = false e
// vazia. A página /artigos do site antigo não mostra categorias nem tags,
// então nada mais é criado. revisarMigracao continua true.
//
// Só mexe no que a migração deixou: título ainda provisório, autores vazios,
// categoria ainda "A classificar". Não toca atualizadoEm (o desfazer da
// importação dos artigos usa atualizadoEm diferente de criadoEm para
// reconhecer a edição de uma pessoa). Uma linha em logAlteracoes por
// documento alterado (usuarioId "migracao", papel "sistema").
//
// Sem "server-only" e com o Firestore por parâmetro: roda no script
// (scripts/organizar-artigos.mts) e nos testes no emulador. A leitura do
// arquivo é pura e testada em testes/unidade/migracao-classificacao.test.mts.
import type { DocumentReference, DocumentSnapshot, Firestore } from "firebase-admin/firestore";
import { COLECAO_ARTIGOS } from "../gravacao/artigos.ts";
import { COLECAO_LOG, registrarNoLote } from "../log/alteracoes.ts";
import { escolherSlugUnico, gerarSlug } from "../slug.ts";
import { CATEGORIA_A_CLASSIFICAR, COLECAO_CATEGORIAS_DE_ARTIGOS } from "./artigos.ts";
import { AUTOR_DA_MIGRACAO, type Modo } from "./execucao.ts";
import { SISTEMA_DE_ORIGEM } from "./imagens.ts";

export const CATEGORIA_ARTIGOS_CIENTIFICOS = { chave: "artigos-cientificos", nome: "Artigos científicos" } as const;
export const RESUMO_DA_ORGANIZACAO = "Título e autores lidos na imagem do artigo e categoria organizada (25/10/2026, a revisar).";

const LIMITE_DO_TITULO = 300;
const LIMITE_DOS_AUTORES = 300;
const CHAVE_DO_ARTIGO = /^artigo-(\d+)$/;

export type TextoDoArtigo = { titulo: string; autores: string };

// Lê o arquivo privado. Título vazio fica de fora (o artigo continua com o
// título provisório); nada é inventado nem completado.
export function lerTitulosDosArtigos(dados: unknown): { ok: true; artigos: Map<string, TextoDoArtigo> } | { ok: false; erros: string[] } {
  const erros: string[] = [];
  const artigos = new Map<string, TextoDoArtigo>();
  const lista = typeof dados === "object" && dados !== null ? (dados as { artigos?: unknown }).artigos : undefined;
  if (typeof lista !== "object" || lista === null) return { ok: false, erros: ["O arquivo precisa ter o objeto \"artigos\"."] };
  for (const [chave, valor] of Object.entries(lista)) {
    if (!CHAVE_DO_ARTIGO.test(chave)) {
      erros.push(`Chave fora do formato artigo-n: ${chave}.`);
      continue;
    }
    const campos = typeof valor === "object" && valor !== null ? (valor as Record<string, unknown>) : {};
    const titulo = typeof campos.titulo === "string" ? campos.titulo.replace(/\s+/g, " ").trim() : "";
    const autores = typeof campos.autores === "string" ? campos.autores.replace(/\s+/g, " ").trim() : "";
    if (titulo.length > LIMITE_DO_TITULO) erros.push(`${chave}: título com mais de ${LIMITE_DO_TITULO} caracteres.`);
    if (autores.length > LIMITE_DOS_AUTORES) erros.push(`${chave}: autores com mais de ${LIMITE_DOS_AUTORES} caracteres.`);
    if (/@/.test(autores)) erros.push(`${chave}: os autores não podem ter e-mail.`);
    artigos.set(chave, { titulo, autores });
  }
  return erros.length ? { ok: false, erros } : { ok: true, artigos };
}

export function tituloProvisorioDaChave(chave: string): string | null {
  const numero = CHAVE_DO_ARTIGO.exec(chave)?.[1];
  return numero ? `Título a confirmar (artigo ${numero})` : null;
}

export async function organizarArtigos(opcoes: { db: Firestore; textos: Map<string, TextoDoArtigo>; modo: Modo; execucao: string }) {
  const { db, textos, modo, execucao } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const categorias = (await db.collection(COLECAO_CATEGORIAS_DE_ARTIGOS).get()).docs;
  const daMigracao = (chave: string) => categorias.find((documento) => documento.get("origem.sistema") === SISTEMA_DE_ORIGEM && documento.get("origem.chave") === chave);
  const aClassificar = daMigracao(CATEGORIA_A_CLASSIFICAR.chave);
  if (!aClassificar) return { ok: false as const, mensagem: "A categoria \"A classificar\" da migração não existe: rode antes npm run migracao:artigos. Nada foi gravado." };
  const cientificos = daMigracao(CATEGORIA_ARTIGOS_CIENTIFICOS.chave);
  if (!cientificos && categorias.some((documento) => gerarSlug(String(documento.get("nome") ?? "")) === gerarSlug(CATEGORIA_ARTIGOS_CIENTIFICOS.nome))) {
    return { ok: false as const, mensagem: `Já existe, fora da migração, uma categoria de artigos chamada "${CATEGORIA_ARTIGOS_CIENTIFICOS.nome}". Nada foi gravado.` };
  }

  const artigos = (await db.collection(COLECAO_ARTIGOS).where("origem.sistema", "==", SISTEMA_DE_ORIGEM).get()).docs;
  const planos = artigos.map((documento) => {
    const chave = String(documento.get("origem.chave") ?? "");
    const texto = textos.get(chave);
    const campos: Record<string, unknown> = {};
    const provisorio = tituloProvisorioDaChave(chave);
    if (texto?.titulo && provisorio && documento.get("titulo") === provisorio) campos.titulo = texto.titulo;
    if (texto?.autores && !documento.get("autores")) campos.autores = texto.autores;
    // A categoria só muda se o artigo ainda está em "A classificar".
    const mudaCategoria = documento.get("categoria") === aClassificar.id;
    return { documento, chave, campos, mudaCategoria, semTitulo: !texto?.titulo };
  });
  const aAlterar = planos.filter((plano) => Object.keys(plano.campos).length > 0 || plano.mudaCategoria);
  const desativaAClassificar = aClassificar.get("ativa") !== false;

  let idDosCientificos = cientificos?.id ?? null;
  const alterados: string[] = [];
  if (modo === "executar") {
    if (!cientificos) {
      const referencia = db.collection(COLECAO_CATEGORIAS_DE_ARTIGOS).doc();
      const ordem = Math.max(0, ...categorias.filter((documento) => !documento.get("excluidoEm")).map((documento) => Number(documento.get("ordem") ?? 0))) + 1;
      const slug = escolherSlugUnico(gerarSlug(CATEGORIA_ARTIGOS_CIENTIFICOS.nome), new Set(categorias.map((documento) => String(documento.get("slug") ?? ""))));
      const momento = new Date();
      const lote = db.batch();
      lote.create(referencia, { nome: CATEGORIA_ARTIGOS_CIENTIFICOS.nome, slug, ordem, imagemMidiaId: null, ativa: true, origem: { sistema: SISTEMA_DE_ORIGEM, chave: CATEGORIA_ARTIGOS_CIENTIFICOS.chave, execucao }, revisarMigracao: true, criadoEm: momento, atualizadoEm: momento, excluidoEm: null });
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, { colecao: COLECAO_CATEGORIAS_DE_ARTIGOS, documentoId: referencia.id, acao: "criar", campos: ["nome", "ordem", "ativa"], resumo: "Categoria criada pela organização dos artigos importados.", origem: "migracao", execucao });
      await lote.commit();
      idDosCientificos = referencia.id;
    }
    for (const plano of aAlterar) {
      const campos = { ...plano.campos, ...(plano.mudaCategoria ? { categoria: idDosCientificos } : {}) };
      const lote = db.batch();
      lote.update(plano.documento.ref, campos, { lastUpdateTime: plano.documento.updateTime });
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, { colecao: COLECAO_ARTIGOS, documentoId: plano.documento.id, acao: "editar", campos: Object.keys(campos), resumo: RESUMO_DA_ORGANIZACAO, origem: "migracao", execucao });
      await lote.commit();
      alterados.push(plano.documento.id);
    }
    if (desativaAClassificar) {
      const lote = db.batch();
      lote.update(aClassificar.ref, { ativa: false }, { lastUpdateTime: aClassificar.updateTime });
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, { colecao: COLECAO_CATEGORIAS_DE_ARTIGOS, documentoId: aClassificar.id, acao: "editar", campos: ["ativa"], resumo: "Categoria desativada (os artigos foram para \"Artigos científicos\").", origem: "migracao", execucao });
      await lote.commit();
    }
  }

  return {
    ok: true as const,
    relatorio: {
      script: "organizar-artigos",
      execucao,
      modo,
      iniciadoEm,
      terminadoEm: new Date().toISOString(),
      contagens: {
        artigosImportados: artigos.length,
        comTituloLido: planos.filter((plano) => "titulo" in plano.campos).length,
        semTituloLegivelOuJaEditado: planos.filter((plano) => !("titulo" in plano.campos)).length,
        comAutoresLidos: planos.filter((plano) => "autores" in plano.campos).length,
        mudamDeCategoria: planos.filter((plano) => plano.mudaCategoria).length,
        aAlterar: aAlterar.length,
        alterados: alterados.length,
        categoriaArtigosCientificos: cientificos ? "já existe" : modo === "executar" ? "criada" : "seria criada",
        aClassificarDesativada: desativaAClassificar,
      },
      // Só ids e chaves (artigo-n), sem títulos nem autores.
      artigos: planos.map((plano) => ({ id: plano.documento.id, chave: plano.chave, campos: Object.keys(plano.campos), mudaCategoria: plano.mudaCategoria })),
      categoriaArtigosCientificos: idDosCientificos,
      alterados,
    },
  };
}

// Desfaz uma execução: volta o título provisório, os autores vazios e a
// categoria "A classificar" nos artigos que ela alterou, reativa "A
// classificar" se ela a desativou e apaga "Artigos científicos" se ela a
// criou e nenhum artigo a usa. Pula o que uma pessoa alterou depois.
export async function desfazerOrganizacao(opcoes: { db: Firestore; execucaoAlvo: string; execucao: string; modo: Modo }) {
  const { db, execucaoAlvo, execucao, modo } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const registros = (await db.collection(COLECAO_LOG).where("execucao", "==", execucaoAlvo).get()).docs.filter((registro) => registro.get("origem") === "migracao");
  const momentoDe = (registro: DocumentSnapshot) => registro.get("criadoEm")?.toMillis?.() ?? null;
  const alteradoDepois = async (documento: DocumentSnapshot, desde: number | null) => {
    const atualizado = documento.get("atualizadoEm")?.toMillis?.() ?? null;
    const daPessoa = (await db.collection(COLECAO_LOG).where("documentoId", "==", documento.id).get()).docs.filter((registro) => registro.get("origem") !== "migracao").map((registro) => momentoDe(registro) ?? Number.POSITIVE_INFINITY);
    return desde === null || daPessoa.some((momento) => momento > desde) || (atualizado !== null && atualizado > desde);
  };
  const aClassificar = (await db.collection(COLECAO_CATEGORIAS_DE_ARTIGOS).where("origem.chave", "==", CATEGORIA_A_CLASSIFICAR.chave).get()).docs.find((documento) => documento.get("origem.sistema") === SISTEMA_DE_ORIGEM);

  const acoes: { referencia: DocumentReference; documento: DocumentSnapshot; campos: Record<string, unknown> | null; colecao: string; registro: string[] }[] = [];
  const pulados: { colecao: string; id: string; motivo: string }[] = [];
  for (const registro of registros) {
    const colecao = String(registro.get("colecao"));
    const id = String(registro.get("documentoId"));
    const documento = await db.collection(colecao).doc(id).get();
    if (!documento.exists) continue;
    const campos = (registro.get("campos") as string[] | undefined) ?? [];
    if (colecao === COLECAO_ARTIGOS && registro.get("resumo") === RESUMO_DA_ORGANIZACAO) {
      if (await alteradoDepois(documento, momentoDe(registro))) {
        pulados.push({ colecao, id, motivo: "alterado por uma pessoa depois da organização" });
        continue;
      }
      const volta: Record<string, unknown> = {};
      if (campos.includes("titulo")) volta.titulo = tituloProvisorioDaChave(String(documento.get("origem.chave") ?? "")) ?? documento.get("titulo");
      if (campos.includes("autores")) volta.autores = "";
      if (campos.includes("categoria") && aClassificar) volta.categoria = aClassificar.id;
      acoes.push({ referencia: documento.ref, documento, campos: volta, colecao, registro: Object.keys(volta) });
    } else if (colecao === COLECAO_CATEGORIAS_DE_ARTIGOS && registro.get("acao") === "editar" && campos.includes("ativa")) {
      if (await alteradoDepois(documento, momentoDe(registro))) pulados.push({ colecao, id, motivo: "alterada por uma pessoa depois" });
      else acoes.push({ referencia: documento.ref, documento, campos: { ativa: true }, colecao, registro: ["ativa"] });
    }
  }
  // A categoria criada sai depois que os artigos voltam (se nenhum outro a usa).
  const voltam = new Set(acoes.filter((acao) => acao.colecao === COLECAO_ARTIGOS && "categoria" in (acao.campos ?? {})).map((acao) => acao.documento.id));
  for (const registro of registros.filter((item) => item.get("colecao") === COLECAO_CATEGORIAS_DE_ARTIGOS && item.get("acao") === "criar")) {
    const documento = await db.collection(COLECAO_CATEGORIAS_DE_ARTIGOS).doc(String(registro.get("documentoId"))).get();
    if (!documento.exists) continue;
    const usada = (await db.collection(COLECAO_ARTIGOS).where("categoria", "==", documento.id).get()).docs.some((artigo) => !voltam.has(artigo.id));
    if (usada) pulados.push({ colecao: COLECAO_CATEGORIAS_DE_ARTIGOS, id: documento.id, motivo: "ainda usada por algum artigo" });
    else if (await alteradoDepois(documento, momentoDe(registro))) pulados.push({ colecao: COLECAO_CATEGORIAS_DE_ARTIGOS, id: documento.id, motivo: "alterada por uma pessoa" });
    else acoes.push({ referencia: documento.ref, documento, campos: null, colecao: COLECAO_CATEGORIAS_DE_ARTIGOS, registro: [] });
  }

  if (modo === "executar") {
    for (const acao of acoes) {
      const lote = db.batch();
      if (acao.campos) lote.update(acao.referencia, acao.campos, { lastUpdateTime: acao.documento.updateTime });
      else lote.delete(acao.referencia);
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, { colecao: acao.colecao, documentoId: acao.documento.id, acao: acao.campos ? "editar" : "excluir_definitivo", campos: acao.registro, resumo: `Organização dos artigos desfeita (execução ${execucaoAlvo}).`, origem: "migracao", execucao });
      await lote.commit();
    }
  }

  return {
    script: "organizar-artigos (desfazer)",
    execucao,
    execucaoDesfeita: execucaoAlvo,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    contagens: {
      artigosQueVoltam: acoes.filter((acao) => acao.colecao === COLECAO_ARTIGOS).length,
      categoriasQueVoltam: acoes.filter((acao) => acao.colecao === COLECAO_CATEGORIAS_DE_ARTIGOS && acao.campos).length,
      categoriasQueSaem: acoes.filter((acao) => !acao.campos).length,
      pulados: pulados.length,
    },
    ids: acoes.map((acao) => `${acao.colecao}/${acao.documento.id}`),
    pulados,
  };
}

