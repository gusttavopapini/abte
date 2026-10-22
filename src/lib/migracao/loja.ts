// Migração da loja do site antigo (etapa 6, degrau 3): categorias "abte" e
// "produtos-parceiros" e os produtos, todos com publicado = false, sem
// pagamento nem carrinho (a loja continua vitrine "Em breve"). As regras de
// conversão ficam em produtos.ts; aqui, a leitura do Firestore, a gravação
// com o registro de alterações, o desfazer e o relatório.
//
// Idempotente por origem.chave (slug antigo do produto ou da categoria). A
// galeria e a imagem da categoria são ligadas pelas imagens já importadas
// (origem.midiaId). Sem "server-only" e com o Firestore por parâmetro: roda
// no script (scripts/migrar-loja.mts) e nos testes no emulador.
import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import { COLECAO_PRODUTOS } from "../gravacao/produtos.ts";
import { COLECAO_LOG, registrarNoLote } from "../log/alteracoes.ts";
import { escolherSlugUnico, gerarSlug } from "../slug.ts";
import { AUTOR_DA_MIGRACAO, type Modo } from "./execucao.ts";
import { SISTEMA_DE_ORIGEM, imagensImportadas } from "./imagens.ts";
import type { ImagemDeOrigem } from "./imagensOrigem.ts";
import {
  CATEGORIAS_MIGRADAS,
  COLECAO_CATEGORIAS_DE_PRODUTOS,
  PROBLEMAS_DO_PRODUTO,
  converterProduto,
  redirecionamentosDaLoja,
  slugNovo,
  type CategoriaDoMapa,
  type DiferencaDaPagina,
  type ProdutoColetado,
  type ProdutoDoMapa,
} from "./produtos.ts";

export const MENSAGEM_SEM_IMAGENS_DA_LOJA = "Nenhuma imagem importada do site antigo no projeto: rode antes a migração das imagens (npm run migracao:imagens). Nada foi gravado.";

type Existente = { id: string; slug: string; chave: string | null; nome: string };

async function lerExistentes(db: Firestore, colecao: string): Promise<Existente[]> {
  const documentos = await db.collection(colecao).select("slug", "origem", "nome").get();
  return documentos.docs.map((documento) => ({
    id: documento.id,
    slug: String(documento.get("slug") ?? ""),
    chave: typeof documento.get("origem.chave") === "string" && documento.get("origem.sistema") === SISTEMA_DE_ORIGEM ? documento.get("origem.chave") : null,
    nome: String(documento.get("nome") ?? ""),
  }));
}

function contar(valores: string[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const valor of valores) contagem[valor] = (contagem[valor] ?? 0) + 1;
  return Object.fromEntries(Object.entries(contagem).sort(([a], [b]) => a.localeCompare(b)));
}

export type RelatorioDaLoja = Extract<Awaited<ReturnType<typeof migrarLoja>>, { ok: true }>;

export async function migrarLoja(opcoes: {
  db: Firestore;
  produtos: ProdutoDoMapa[];
  categoriasDoMapa: CategoriaDoMapa[];
  coletados: Map<string, ProdutoColetado>;
  imagensDeOrigem: ImagemDeOrigem[];
  modo: Modo;
  execucao: string;
  limite: number | null;
}) {
  const { db, produtos, categoriasDoMapa, coletados, imagensDeOrigem, modo, execucao, limite } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const imagens = await imagensImportadas(db);
  if (modo === "executar" && imagens.size === 0) return { ok: false as const, mensagem: MENSAGEM_SEM_IMAGENS_DA_LOJA };
  const idDaImagem = (midiaIdWix: string) => {
    const imagem = imagens.get(midiaIdWix);
    return imagem && !imagem.naLixeira ? imagem.id : null;
  };
  const usosDe = (tipo: string, chave: string) =>
    imagensDeOrigem
      .flatMap((imagem) => imagem.usos.filter((uso) => uso.tipo === tipo && uso.chaveDeOrigem === chave).map((uso) => ({ midiaIdWix: imagem.midiaIdWix, posicao: uso.posicao })))
      .sort((a, b) => a.posicao - b.posicao);

  // Categorias.
  const categoriasExistentes = await lerExistentes(db, COLECAO_CATEGORIAS_DE_PRODUTOS);
  const slugsDeCategoria = new Set(categoriasExistentes.map((categoria) => categoria.slug));
  const idsDasCategorias = new Map<string, string>();
  const conflitos: string[] = [];
  const categorias = CATEGORIAS_MIGRADAS.map((slugAntigo, i) => {
    const doMapa = categoriasDoMapa.find((categoria) => categoria.slug === slugAntigo);
    const nome = doMapa?.nome ?? slugAntigo;
    const existente = categoriasExistentes.find((categoria) => categoria.chave === slugAntigo);
    const imagemWix = usosDe("categoriaDeProduto", slugAntigo)[0]?.midiaIdWix ?? null;
    if (existente) {
      idsDasCategorias.set(slugAntigo, existente.id);
      return { slugAntigo, nome, slugNovo: existente.slug, existente: true, imagemWix, imagemMidiaId: null as string | null, id: existente.id };
    }
    // O painel não aceita duas categorias com o mesmo nome.
    if (categoriasExistentes.some((categoria) => gerarSlug(categoria.nome) === gerarSlug(nome))) conflitos.push(`Já existe uma categoria de produtos chamada "${nome}" que não veio da migração.`);
    const slug = escolherSlugUnico(gerarSlug(nome), slugsDeCategoria);
    slugsDeCategoria.add(slug);
    idsDasCategorias.set(slugAntigo, `(nova: ${slugAntigo})`);
    return { slugAntigo, nome, slugNovo: slug, existente: false, imagemWix, imagemMidiaId: imagemWix ? idDaImagem(imagemWix) : null, id: null as string | null, ordem: i + 1 };
  });
  if (modo === "executar" && conflitos.length > 0) return { ok: false as const, mensagem: `${conflitos.join(" ")} Nada foi gravado.` };

  // Produtos.
  const produtosExistentes = await lerExistentes(db, COLECAO_PRODUTOS);
  const slugsDeProduto = new Set(produtosExistentes.map((produto) => produto.slug));
  const planos = produtos.map((produto, i) => {
    const existente = produtosExistentes.find((item) => item.chave === produto.slug);
    const galeria = usosDe("produto", produto.slug).map((uso) => ({ midiaIdWix: uso.midiaIdWix, midiaId: idDaImagem(uso.midiaIdWix) }));
    const conversao = converterProduto(produto, i + 1, coletados.get(produto.slug), idsDasCategorias, galeria);
    let slug = existente?.slug ?? "";
    if (!existente) {
      slug = escolherSlugUnico(slugNovo(produto.slug) || "produto", slugsDeProduto);
      slugsDeProduto.add(slug);
    }
    return { produto, posicao: i + 1, existente: Boolean(existente), slug, galeria, ...conversao };
  });
  const candidatos = planos.filter((plano) => !plano.existente);
  const nestaExecucao = limite === null ? candidatos : candidatos.slice(0, limite);

  const criados: { tipo: "categoria" | "produto"; chave: string; id: string }[] = [];
  if (modo === "executar") {
    const agora = () => new Date();
    // Categorias primeiro: os produtos guardam o id delas.
    for (const categoria of categorias.filter((item) => !item.existente)) {
      const referencia = db.collection(COLECAO_CATEGORIAS_DE_PRODUTOS).doc();
      const momento = agora();
      const dados = { nome: categoria.nome, slug: categoria.slugNovo, ordem: categoria.ordem ?? 0, imagemMidiaId: categoria.imagemMidiaId };
      const lote = db.batch();
      lote.create(referencia, {
        ...dados,
        origem: { sistema: SISTEMA_DE_ORIGEM, chave: categoria.slugAntigo, execucao },
        revisarMigracao: categoria.imagemWix !== null && categoria.imagemMidiaId === null,
        criadoEm: momento,
        atualizadoEm: momento,
        excluidoEm: null,
      });
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, {
        colecao: COLECAO_CATEGORIAS_DE_PRODUTOS,
        documentoId: referencia.id,
        acao: "criar",
        campos: [...Object.keys(dados), "origem", "revisarMigracao"],
        resumo: "Categoria de produtos importada do site antigo.",
        origem: "migracao",
        execucao,
      });
      await lote.commit();
      idsDasCategorias.set(categoria.slugAntigo, referencia.id);
      categoria.id = referencia.id;
      criados.push({ tipo: "categoria", chave: categoria.slugAntigo, id: referencia.id });
    }
    for (const plano of nestaExecucao) {
      // Com os ids reais das categorias novas.
      const { dados } = converterProduto(plano.produto, plano.posicao, coletados.get(plano.produto.slug), idsDasCategorias, plano.galeria);
      const referencia = db.collection(COLECAO_PRODUTOS).doc();
      const momento = agora();
      const lote = db.batch();
      lote.create(referencia, {
        ...dados,
        slug: plano.slug,
        origem: { sistema: SISTEMA_DE_ORIGEM, chave: plano.produto.slug, execucao },
        // Todos vão para revisão: os preços do site antigo podem estar defasados (decisão 11).
        revisarMigracao: true,
        criadoEm: momento,
        atualizadoEm: momento,
        excluidoEm: null,
      });
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, {
        colecao: COLECAO_PRODUTOS,
        documentoId: referencia.id,
        acao: "criar",
        campos: [...Object.keys(dados), "slug", "origem", "revisarMigracao"],
        resumo: "Produto importado do site antigo.",
        origem: "migracao",
        execucao,
      });
      await lote.commit();
      criados.push({ tipo: "produto", chave: plano.produto.slug, id: referencia.id });
    }
  }

  const redirecionamentos = redirecionamentosDaLoja(
    planos.map((plano) => ({ slugAntigo: plano.produto.slug, slugNovo: plano.slug })),
    categorias.map((categoria) => ({ slugAntigo: categoria.slugAntigo, slugNovo: categoria.slugNovo })),
  );
  const comDiferenca = (diferenca: DiferencaDaPagina) => planos.filter((plano) => plano.diferencas.includes(diferenca)).map((plano) => plano.posicao);
  return {
    ok: true as const,
    script: "migrar-loja",
    execucao,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    limite,
    contagens: {
      categorias: { previstas: categorias.length, jaExistentes: categorias.filter((categoria) => categoria.existente).length, criadas: criados.filter((item) => item.tipo === "categoria").length },
      produtos: {
        previstos: produtos.length,
        jaExistentes: planos.filter((plano) => plano.existente).length,
        candidatos: candidatos.length,
        nestaExecucao: nestaExecucao.length,
        criados: criados.filter((item) => item.tipo === "produto").length,
      },
      porCategoria: contar(planos.map((plano) => CATEGORIAS_MIGRADAS.find((slug) => plano.produto.categorias.includes(slug)) ?? "(sem categoria)")),
      porTipo: contar(planos.map((plano) => plano.dados.tipo)),
      porStatus: contar(planos.map((plano) => plano.dados.status)),
      comPrecoRiscado: planos.filter((plano) => plano.temPrecoRiscado).length,
      porProblema: Object.fromEntries(PROBLEMAS_DO_PRODUTO.map((problema) => [problema, planos.filter((plano) => plano.problemas.includes(problema)).length])),
      imagensDaGaleria: { noArquivo: planos.reduce((soma, plano) => soma + plano.galeria.length, 0), ligaveisAgora: planos.reduce((soma, plano) => soma + plano.galeria.filter((item) => item.midiaId).length, 0) },
      descricaoLidaNaPagina: planos.filter((plano) => !plano.problemas.includes("descricaoDoMapa")).length,
    },
    categorias: categorias.map((categoria) => ({
      slugAntigo: categoria.slugAntigo,
      nome: categoria.nome,
      slugNovo: categoria.slugNovo,
      jaExistente: categoria.existente,
      imagem: categoria.imagemWix === null ? "sem imagem no arquivo" : categoria.imagemMidiaId ? "ligada" : "pendente (imagem ainda não importada)",
    })),
    conflitos,
    produtos: planos.map((plano) => ({
      posicao: plano.posicao,
      slugAntigo: plano.produto.slug,
      slugNovo: plano.slug,
      slugMuda: plano.slug !== plano.produto.slug,
      categoria: CATEGORIAS_MIGRADAS.find((slug) => plano.produto.categorias.includes(slug)) ?? null,
      tipo: plano.dados.tipo,
      status: plano.dados.status,
      preco: plano.dados.preco,
      precoPromocional: plano.dados.precoPromocional,
      imagens: `${plano.galeria.filter((item) => item.midiaId).length} de ${plano.galeria.length}`,
      problemas: plano.problemas,
      diferencasDaPagina: plano.diferencas,
      jaExistente: plano.existente,
    })),
    diferencasDaPagina: {
      precoDiferente: comDiferenca("precoDiferente"),
      tipoDiferente: comDiferenca("tipoDiferente"),
      estoqueDiferente: comDiferenca("estoqueDiferente"),
      temOpcoes: comDiferenca("temOpcoes"),
      temCamposDeTexto: comDiferenca("temCamposDeTexto"),
      temSelo: comDiferenca("temSelo"),
    },
    marcadosComOpcaoNoMapa: planos.filter((plano) => plano.produto.temOpcoes.length > 0).map((plano) => plano.posicao),
    redirecionamentos,
    criados,
  };
}

// Desfaz uma execução: produtos e categorias com origem.execucao igual à
// indicada. Pula o que uma pessoa alterou depois (com incluirEditados e a
// segunda confirmação, também saem) e a categoria ainda usada por um produto
// que fica. Primeiro decide tudo; só depois apaga.
export async function desfazerLoja(opcoes: { db: Firestore; execucaoAlvo: string; execucao: string; modo: Modo; incluirEditados: boolean; confirmacaoDeEditados?: number | null }) {
  const { db, execucaoAlvo, execucao, modo, incluirEditados, confirmacaoDeEditados = null } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const pulados: { colecao: string; id: string; motivo: string }[] = [];
  const aDesfazer: { colecao: string; referencia: DocumentReference; editadoPorPessoa: boolean }[] = [];
  const editadoPorPessoa = async (id: string) => (await db.collection(COLECAO_LOG).where("documentoId", "==", id).get()).docs.some((registro) => registro.get("origem") !== "migracao");

  const produtos = await db.collection(COLECAO_PRODUTOS).where("origem.execucao", "==", execucaoAlvo).get();
  const produtosQueSaem = new Set<string>();
  for (const documento of produtos.docs) {
    const editado = await editadoPorPessoa(documento.id);
    if (editado && !incluirEditados) {
      pulados.push({ colecao: COLECAO_PRODUTOS, id: documento.id, motivo: "alterado por uma pessoa depois da importação" });
      continue;
    }
    produtosQueSaem.add(documento.id);
    aDesfazer.push({ colecao: COLECAO_PRODUTOS, referencia: documento.ref, editadoPorPessoa: editado });
  }
  const categorias = await db.collection(COLECAO_CATEGORIAS_DE_PRODUTOS).where("origem.execucao", "==", execucaoAlvo).get();
  for (const documento of categorias.docs) {
    const usadaPor = await db.collection(COLECAO_PRODUTOS).where("categoria", "==", documento.id).get();
    if (usadaPor.docs.some((produto) => !produtosQueSaem.has(produto.id))) {
      pulados.push({ colecao: COLECAO_CATEGORIAS_DE_PRODUTOS, id: documento.id, motivo: "usada por um produto que fica" });
      continue;
    }
    const editado = await editadoPorPessoa(documento.id);
    if (editado && !incluirEditados) {
      pulados.push({ colecao: COLECAO_CATEGORIAS_DE_PRODUTOS, id: documento.id, motivo: "alterada por uma pessoa depois da importação" });
      continue;
    }
    aDesfazer.push({ colecao: COLECAO_CATEGORIAS_DE_PRODUTOS, referencia: documento.ref, editadoPorPessoa: editado });
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
    script: "migrar-loja (desfazer)",
    execucao,
    execucaoDesfeita: execucaoAlvo,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    bloqueado,
    contagens: { encontrados: produtos.size + categorias.size, desfeitos: desfeitos.length, pulados: pulados.length, editadosPorPessoaQueSairiam: editadosQueSairiam },
    desfeitos,
    pulados,
  };
}

function tabela(titulo: string, contagem: Record<string, number>): string {
  return [`| ${titulo} | Quantidade |`, "|---|---|", ...Object.entries(contagem).map(([chave, valor]) => `| ${chave} | ${valor} |`)].join("\n");
}

const reais = (centavos: number | null) => (centavos === null ? "-" : `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`);

export function relatorioDaLojaEmMarkdown(relatorio: RelatorioDaLoja, projeto: string): string {
  const c = relatorio.contagens;
  const lista = (itens: number[]) => (itens.length ? itens.join(", ") : "nenhum");
  return [
    `# Migração da loja (categorias e produtos): ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
    "",
    `- Execução: ${relatorio.execucao}`,
    `- Projeto: ${projeto}`,
    `- Início: ${relatorio.iniciadoEm}; fim: ${relatorio.terminadoEm}`,
    `- Limite: ${relatorio.limite ?? "nenhum"}`,
    "- Todos os produtos entram com publicado = false e revisarMigracao = true. Sem pagamento, carrinho ou checkout.",
    "",
    "## Contagens",
    "",
    "| Item | Quantidade |",
    "|---|---|",
    `| Categorias previstas | ${c.categorias.previstas} (já existentes ${c.categorias.jaExistentes}, criadas ${c.categorias.criadas}) |`,
    `| Produtos previstos | ${c.produtos.previstos} (já existentes ${c.produtos.jaExistentes}, nesta execução ${c.produtos.nestaExecucao}, criados ${c.produtos.criados}) |`,
    `| Com preço riscado (riscado vira preço, atual vira promocional) | ${c.comPrecoRiscado} |`,
    `| Descrição lida na página | ${c.descricaoLidaNaPagina} de ${c.produtos.previstos} |`,
    `| Imagens da galeria | ${c.imagensDaGaleria.noArquivo} no arquivo; ${c.imagensDaGaleria.ligaveisAgora} ligáveis agora |`,
    "",
    tabela("Categoria", c.porCategoria),
    "",
    tabela("Tipo", c.porTipo),
    "",
    tabela("Situação", c.porStatus),
    "",
    tabela("Problema", c.porProblema),
    "",
    "## Categorias",
    "",
    "| Slug antigo | Nome | Slug novo | Imagem |",
    "|---|---|---|---|",
    ...relatorio.categorias.map((categoria) => `| ${categoria.slugAntigo} | ${categoria.nome} | ${categoria.slugNovo}${categoria.jaExistente ? " (já existe)" : ""} | ${categoria.imagem} |`),
    "",
    relatorio.conflitos.length ? `**Conflitos:** ${relatorio.conflitos.join(" ")}` : "Sem conflito de nome com categorias existentes.",
    "",
    "## Produtos",
    "",
    "| Pos. | Slug antigo | Slug novo | Categoria | Tipo | Situação | Preço | Promocional | Imagens | Problemas | Diferenças da página |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
    ...relatorio.produtos.map(
      (produto) =>
        `| ${produto.posicao} | ${produto.slugAntigo} | ${produto.slugNovo}${produto.slugMuda ? " (muda)" : ""} | ${produto.categoria ?? "sem categoria"} | ${produto.tipo} | ${produto.status} | ${reais(produto.preco)} | ${reais(produto.precoPromocional)} | ${produto.imagens} | ${produto.problemas.join(", ") || "-"} | ${produto.diferencasDaPagina.join(", ") || "-"} |`,
    ),
    "",
    "## Diferenças entre o mapa (que vale) e a página atual do site antigo",
    "",
    `- Preço diferente: ${lista(relatorio.diferencasDaPagina.precoDiferente)}`,
    `- Tipo diferente: ${lista(relatorio.diferencasDaPagina.tipoDiferente)}`,
    `- Estoque diferente: ${lista(relatorio.diferencasDaPagina.estoqueDiferente)}`,
    `- Com opções (variações) na página: ${lista(relatorio.diferencasDaPagina.temOpcoes)}`,
    `- Com campos de texto do cliente na página: ${lista(relatorio.diferencasDaPagina.temCamposDeTexto)}`,
    `- Com selo na página (não importado): ${lista(relatorio.diferencasDaPagina.temSelo)}`,
    `- Marcados no mapa como "com opção": ${lista(relatorio.marcadosComOpcaoNoMapa)}`,
    "",
    `Redirecionamentos propostos (NÃO ativados): ${relatorio.redirecionamentos.length}, em tmp-migracao/redirects.json.`,
    "",
  ].join("\n");
}
