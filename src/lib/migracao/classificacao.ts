// Classificação inicial dos posts importados (25/10/2026): cria as
// categorias de post das regras (classificacaoRegras.ts) que ainda não
// existem e grava a categoria em cada post com origem da migração que ainda
// não tem categoria (nem uma que uma pessoa escolheu). Cada post classificado
// ganha revisarClassificacao = true (revisarMigracao continua true). Não toca
// atualizadoEm: o desfazer dos scripts de importação continua certo.
// Uma linha em logAlteracoes por categoria criada e por post classificado
// (usuarioId "migracao", papel "sistema", origem "migracao").
//
// Sem "server-only" e com o Firestore por parâmetro: roda no script
// (scripts/classificar-posts.mts) e nos testes no emulador.
import { FieldValue, type DocumentSnapshot, type Firestore } from "firebase-admin/firestore";
import { COLECAO_POSTS } from "../gravacao/posts.ts";
import { COLECAO_LOG, registrarNoLote } from "../log/alteracoes.ts";
import { gerarSlug } from "../slug.ts";
import { CATEGORIAS_DOS_POSTS, CATEGORIA_GERAL, classificarPost } from "./classificacaoRegras.ts";
import { AUTOR_DA_MIGRACAO, type Modo } from "./execucao.ts";
import { SISTEMA_DE_ORIGEM } from "./imagens.ts";

export const COLECAO_CATEGORIAS_DE_POSTS = "categoriasDePosts";
export const RESUMO_DA_CLASSIFICACAO = "Categoria sugerida pela classificação automática de 25/10/2026 (a revisar).";

// Todas as categorias das regras, mais a "Geral".
export const CATEGORIAS_DA_CLASSIFICACAO = [...CATEGORIAS_DOS_POSTS.map(({ slug, nome, ordem }) => ({ slug, nome, ordem })), { ...CATEGORIA_GERAL }];

function contar(valores: string[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const valor of valores) contagem[valor] = (contagem[valor] ?? 0) + 1;
  return contagem;
}

export type LinhaPrivada = { slug: string; categoria: string; motivo: string };

export async function classificarPosts(opcoes: { db: Firestore; modo: Modo; execucao: string; limite: number | null }) {
  const { db, modo, execucao, limite } = opcoes;
  const iniciadoEm = new Date().toISOString();

  // Categorias: as da migração (pela origem) e, para recusar nome repetido,
  // as criadas por uma pessoa.
  const existentes = (await db.collection(COLECAO_CATEGORIAS_DE_POSTS).get()).docs;
  const daMigracao = new Map(existentes.filter((documento) => documento.get("origem.sistema") === SISTEMA_DE_ORIGEM).map((documento) => [String(documento.get("origem.chave")), documento]));
  const conflitos = CATEGORIAS_DA_CLASSIFICACAO.filter(
    (categoria) => !daMigracao.has(categoria.slug) && existentes.some((documento) => documento.get("origem.sistema") !== SISTEMA_DE_ORIGEM && gerarSlug(String(documento.get("nome") ?? "")) === gerarSlug(categoria.nome)),
  );
  if (conflitos.length) {
    return { ok: false as const, mensagem: `Já existe, fora da migração, categoria de post com o nome de ${conflitos.length} categoria(s) da classificação. Nada foi gravado.` };
  }
  const aCriar = CATEGORIAS_DA_CLASSIFICACAO.filter((categoria) => !daMigracao.has(categoria.slug));

  const posts = (await db.collection(COLECAO_POSTS).where("origem.sistema", "==", SISTEMA_DE_ORIGEM).get()).docs;
  const planos = posts.map((documento) => {
    const classificacao = classificarPost(String(documento.get("titulo") ?? ""), String(documento.get("conteudo") ?? ""));
    return { documento, ...classificacao, jaTemCategoria: Boolean(documento.get("categoria")) };
  });
  const candidatos = planos.filter((plano) => !plano.jaTemCategoria);
  const nestaExecucao = limite === null ? candidatos : candidatos.slice(0, limite);

  const idsDasCategorias = new Map([...daMigracao].map(([slug, documento]) => [slug, documento.id]));
  const categoriasCriadas: string[] = [];
  const classificados: string[] = [];
  if (modo === "executar") {
    for (const categoria of aCriar) {
      const referencia = db.collection(COLECAO_CATEGORIAS_DE_POSTS).doc();
      const momento = new Date();
      const lote = db.batch();
      lote.create(referencia, {
        nome: categoria.nome,
        slug: categoria.slug,
        ordem: categoria.ordem,
        ativa: true,
        origem: { sistema: SISTEMA_DE_ORIGEM, chave: categoria.slug, execucao },
        criadoEm: momento,
        atualizadoEm: momento,
        excluidoEm: null,
      });
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, { colecao: COLECAO_CATEGORIAS_DE_POSTS, documentoId: referencia.id, acao: "criar", campos: ["nome", "ordem", "ativa"], resumo: "Categoria criada pela classificação automática dos posts.", origem: "migracao", execucao });
      await lote.commit();
      idsDasCategorias.set(categoria.slug, referencia.id);
      categoriasCriadas.push(referencia.id);
    }
    for (const plano of nestaExecucao) {
      const lote = db.batch();
      // A gravação só vale se o post não mudou desde a leitura.
      lote.update(plano.documento.ref, { categoria: idsDasCategorias.get(plano.slug), revisarClassificacao: true }, { lastUpdateTime: plano.documento.updateTime });
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, { colecao: COLECAO_POSTS, documentoId: plano.documento.id, acao: "editar", campos: ["categoria", "revisarClassificacao"], resumo: RESUMO_DA_CLASSIFICACAO, origem: "migracao", execucao });
      await lote.commit();
      classificados.push(plano.documento.id);
    }
  }

  // Tabela privada (slug, categoria e motivo): só para o arquivo fora do Git.
  const linhasPrivadas: LinhaPrivada[] = nestaExecucao.map((plano) => ({
    slug: String(plano.documento.get("slug") ?? ""),
    categoria: CATEGORIAS_DA_CLASSIFICACAO.find((categoria) => categoria.slug === plano.slug)?.nome ?? plano.slug,
    motivo: plano.motivo,
  }));

  return {
    ok: true as const,
    relatorio: {
      script: "classificar-posts",
      execucao,
      modo,
      iniciadoEm,
      terminadoEm: new Date().toISOString(),
      limite,
      contagens: {
        postsImportados: posts.length,
        jaComCategoria: planos.filter((plano) => plano.jaTemCategoria).length,
        candidatos: candidatos.length,
        nestaExecucao: nestaExecucao.length,
        classificados: classificados.length,
        categoriasACriar: aCriar.length,
        categoriasCriadas: categoriasCriadas.length,
        porCategoria: Object.fromEntries(CATEGORIAS_DA_CLASSIFICACAO.map((categoria) => [categoria.slug, contar(nestaExecucao.map((plano) => plano.slug))[categoria.slug] ?? 0])),
        // Acerto pelo título, pelo texto ou nenhum (Geral).
        porOrigemDaRegra: contar(nestaExecucao.map((plano) => (plano.motivo.startsWith("título") ? "titulo" : plano.motivo.startsWith("texto") ? "texto" : "nenhuma"))),
      },
      // Só ids.
      categoriasCriadas,
      classificados,
    },
    linhasPrivadas,
  };
}

// Desfaz uma execução: tira a categoria (e a marca de revisão) dos posts que
// ela classificou e apaga as categorias que ela criou. Pula o post que uma
// pessoa alterou depois (registro fora da migração ou atualizadoEm posterior)
// ou cuja categoria já é outra, e a categoria ainda usada por algum post ou
// alterada por uma pessoa. Primeiro decide tudo; só depois grava.
export async function desfazerClassificacao(opcoes: { db: Firestore; execucaoAlvo: string; execucao: string; modo: Modo }) {
  const { db, execucaoAlvo, execucao, modo } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const registros = (await db.collection(COLECAO_LOG).where("execucao", "==", execucaoAlvo).get()).docs.filter((registro) => registro.get("origem") === "migracao");
  const momentoDe = (registro: DocumentSnapshot) => registro.get("criadoEm")?.toMillis?.() ?? null;
  const alteradoPorPessoaDepois = async (id: string, desde: number | null, dados: Record<string, unknown> | undefined) => {
    const atualizado = (dados?.atualizadoEm as { toMillis?: () => number } | undefined)?.toMillis?.() ?? null;
    const daPessoa = (await db.collection(COLECAO_LOG).where("documentoId", "==", id).get()).docs.filter((registro) => registro.get("origem") !== "migracao").map((registro) => momentoDe(registro) ?? Number.POSITIVE_INFINITY);
    return desde === null || daPessoa.some((momento) => momento > desde) || (atualizado !== null && atualizado > desde);
  };

  const postsAVoltar: DocumentSnapshot[] = [];
  const categoriasAApagar: DocumentSnapshot[] = [];
  const pulados: { colecao: string; id: string; motivo: string }[] = [];
  const categoriasDaExecucao = new Set<string>();
  for (const registro of registros.filter((item) => item.get("colecao") === COLECAO_CATEGORIAS_DE_POSTS && item.get("acao") === "criar")) categoriasDaExecucao.add(String(registro.get("documentoId")));

  for (const registro of registros.filter((item) => item.get("colecao") === COLECAO_POSTS && item.get("resumo") === RESUMO_DA_CLASSIFICACAO)) {
    const id = String(registro.get("documentoId"));
    const documento = await db.collection(COLECAO_POSTS).doc(id).get();
    if (!documento.exists) {
      pulados.push({ colecao: COLECAO_POSTS, id, motivo: "documento não existe mais" });
      continue;
    }
    if (await alteradoPorPessoaDepois(id, momentoDe(registro), documento.data())) {
      pulados.push({ colecao: COLECAO_POSTS, id, motivo: "alterado por uma pessoa depois da classificação" });
      continue;
    }
    postsAVoltar.push(documento);
  }
  const voltam = new Set(postsAVoltar.map((documento) => documento.id));
  const postsComCategoria = (await db.collection(COLECAO_POSTS).select("categoria").get()).docs.filter((documento) => !voltam.has(documento.id));
  for (const id of categoriasDaExecucao) {
    const documento = await db.collection(COLECAO_CATEGORIAS_DE_POSTS).doc(id).get();
    if (!documento.exists) continue;
    const criacao = registros.find((registro) => registro.get("documentoId") === id);
    if (postsComCategoria.some((post) => post.get("categoria") === id)) pulados.push({ colecao: COLECAO_CATEGORIAS_DE_POSTS, id, motivo: "ainda usada por algum post" });
    else if (await alteradoPorPessoaDepois(id, criacao ? momentoDe(criacao) : null, documento.data())) pulados.push({ colecao: COLECAO_CATEGORIAS_DE_POSTS, id, motivo: "alterada por uma pessoa" });
    else categoriasAApagar.push(documento);
  }

  if (modo === "executar") {
    for (const documento of postsAVoltar) {
      const lote = db.batch();
      lote.update(documento.ref, { categoria: FieldValue.delete(), revisarClassificacao: FieldValue.delete() }, { lastUpdateTime: documento.updateTime });
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, { colecao: COLECAO_POSTS, documentoId: documento.id, acao: "editar", campos: ["categoria", "revisarClassificacao"], resumo: `Classificação desfeita (execução ${execucaoAlvo}).`, origem: "migracao", execucao });
      await lote.commit();
    }
    for (const documento of categoriasAApagar) {
      const lote = db.batch();
      lote.delete(documento.ref);
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, { colecao: COLECAO_CATEGORIAS_DE_POSTS, documentoId: documento.id, acao: "excluir_definitivo", campos: [], resumo: `Classificação desfeita (execução ${execucaoAlvo}).`, origem: "migracao", execucao });
      await lote.commit();
    }
  }

  return {
    script: "classificar-posts (desfazer)",
    execucao,
    execucaoDesfeita: execucaoAlvo,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    contagens: { postsQueVoltam: postsAVoltar.length, categoriasQueSaem: categoriasAApagar.length, pulados: pulados.length },
    posts: postsAVoltar.map((documento) => documento.id),
    categorias: categoriasAApagar.map((documento) => documento.id),
    pulados,
  };
}

// Arquivo privado (fora do Git): slug, categoria e motivo de cada post.
export function tabelaPrivadaEmMarkdown(linhas: LinhaPrivada[], execucao: string, modo: Modo): string {
  return [
    `# Classificação dos posts (${modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"} ${execucao})`,
    "",
    "Arquivo privado, fora do Git. Regras em src/lib/migracao/classificacaoRegras.ts. Todo post classificado fica com revisarClassificacao = true.",
    "",
    "| Slug | Categoria | Motivo |",
    "|---|---|---|",
    ...linhas.map((linha) => `| ${linha.slug} | ${linha.categoria} | ${linha.motivo} |`),
    "",
  ].join("\n");
}

