// Conversão dos posts coletados do site antigo para o Markdown restrito
// (etapa 6, degrau 4a). Trabalha só com arquivos locais: não usa a rede nem o
// Firebase, e não importa nada.
//
// Uso:
//   npm run migracao:converter-posts
//
// Entradas (fora do Git, em docs/dados-privados/): posts-coletados/ (a
// coleta: npm run migracao:coletar-posts), mapa-site-antigo.jsonl e
// imagens-origem.json (imagens do corpo pela posição do uso postCorpo).
// Saídas: docs/dados-privados/posts-convertidos/{slug}.md e indice.json (com
// a meta description e a foto do autor, para a importação), as listas de
// links para conferência (links-http.md e links-internos-sem-destino.md, em
// docs/dados-privados/), tudo fora do Git, e o relatório em tmp-migracao/
// (fora do Git): por post, imagens, links removidos, o que foi adaptado ou
// descartado, idioma, pontos para revisão e avisos. O terminal mostra só
// contagens.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { novoIdDeExecucao } from "../src/lib/migracao/execucao.ts";
import { validarImagensOrigem } from "../src/lib/migracao/imagensOrigem.ts";
import { fotoDoAutor } from "../src/lib/migracao/postsColeta.ts";
import { converterCorpoDoPost, idiomaDoPost, lerPostsDoMapa, type LinkRemovido, type RelatorioDaConversao } from "../src/lib/migracao/postsConversao.ts";
import { PASTA_DA_SAIDA, gravarRelatorio } from "../src/lib/migracao/saida.ts";

const MAPA = "docs/dados-privados/mapa-site-antigo.jsonl";
const IMAGENS = "docs/dados-privados/imagens-origem.json";
const COLETADOS = "docs/dados-privados/posts-coletados";
const CONVERTIDOS = "docs/dados-privados/posts-convertidos";
const LINKS_HTTP = "docs/dados-privados/links-http.md";
const LINKS_INTERNOS = "docs/dados-privados/links-internos-sem-destino.md";

function parar(mensagem: string): never {
  console.error(mensagem);
  process.exit(1);
}

function somarEm(total: Record<string, number>, parcial: Record<string, number>) {
  for (const [chave, valor] of Object.entries(parcial)) total[chave] = (total[chave] ?? 0) + valor;
}

function principal() {
  if (process.argv.length > 2) parar("Este script não aceita argumentos. Nada foi feito.");
  const mapa = lerPostsDoMapa(readFileSync(MAPA, "utf8"));
  if (!mapa.ok) parar(`Mapa recusado:\n${mapa.erros.map((erro) => `  ${erro}`).join("\n")}`);
  const imagens = validarImagensOrigem(JSON.parse(readFileSync(IMAGENS, "utf8")));
  if (!imagens.ok) parar(`imagens-origem.json recusado (${imagens.erros.length} problema(s)).`);
  if (!existsSync(join(COLETADOS, "indice.json"))) parar(`Coleta não encontrada em ${COLETADOS}/. Rode antes npm run migracao:coletar-posts -- --executar.`);
  const coleta = JSON.parse(readFileSync(join(COLETADOS, "indice.json"), "utf8")) as { posts: { slug: string; artigoAchado?: boolean; publicadoEmNaPagina?: string | null; dataIgualAoMapa?: boolean; descricaoMeta?: string | null }[] };
  const daColeta = new Map(coleta.posts.map((item) => [item.slug, item]));

  const usosDoCorpo = (slug: string) =>
    imagens.imagens
      .flatMap((imagem) => imagem.usos.filter((uso) => uso.tipo === "postCorpo" && uso.chaveDeOrigem === slug).map((uso) => ({ id: imagem.midiaIdWix, posicao: uso.posicao })))
      .sort((a, b) => a.posicao - b.posicao)
      .map((item) => item.id);
  const capaDe = (slug: string) => imagens.imagens.find((imagem) => imagem.usos.some((uso) => uso.tipo === "post" && uso.chaveDeOrigem === slug))?.midiaIdWix ?? null;

  mkdirSync(CONVERTIDOS, { recursive: true });
  const execucao = novoIdDeExecucao(new Date());
  const porPost: (Omit<RelatorioDaConversao, "avisos"> & { slug: string; idioma: string; publicadoEm: string; dataConferida: boolean; avisos: string[]; erro?: string })[] = [];
  const indice: Record<string, unknown>[] = [];
  for (const post of mapa.posts) {
    const arquivo = join(COLETADOS, `${post.slug.normalize("NFC")}.html`);
    const idioma = idiomaDoPost(post);
    const coletado = daColeta.get(post.slug);
    if (!existsSync(arquivo)) {
      porPost.push({ slug: post.slug, idioma, publicadoEm: post.publicadoEm, dataConferida: false, erro: "artigo não coletado", ...vazio() });
      continue;
    }
    const artigoHtml = readFileSync(arquivo, "utf8");
    const resultado = converterCorpoDoPost(artigoHtml, { imagensEsperadas: usosDoCorpo(post.slug), capa: capaDe(post.slug) });
    if (!resultado.ok) {
      porPost.push({ slug: post.slug, idioma, publicadoEm: post.publicadoEm, dataConferida: Boolean(coletado?.dataIgualAoMapa), erro: resultado.erro, ...vazio() });
      continue;
    }
    if (/wixstatic/i.test(resultado.markdown)) parar(`O Markdown de um post ficou com endereço do Wix (${post.slug}). Nada mais foi gravado; confira o conversor.`);
    writeFileSync(join(CONVERTIDOS, `${post.slug.normalize("NFC")}.md`), resultado.markdown, { mode: 0o600 });
    indice.push({
      slug: post.slug,
      idioma,
      publicadoEm: post.publicadoEm,
      atualizadoEm: post.atualizadoEm,
      dataConferidaNaPagina: Boolean(coletado?.dataIgualAoMapa),
      caracteres: resultado.markdown.length,
      descricaoMeta: coletado?.descricaoMeta ?? null,
      fotoDoAutorWix: fotoDoAutor(artigoHtml),
      capaRemovidaDoCorpo: resultado.relatorio.imagens.capaRemovidaDoCorpo > 0,
      paraRevisar: resultado.relatorio.paraRevisar,
    });
    porPost.push({ slug: post.slug, idioma, publicadoEm: post.publicadoEm, dataConferida: Boolean(coletado?.dataIgualAoMapa), ...resultado.relatorio });
  }
  writeFileSync(join(CONVERTIDOS, "indice.json"), `${JSON.stringify({ versao: 1, convertidoEm: new Date().toISOString(), formato: "markdown restrito (decisão 1)", posts: indice }, null, 2)}\n`, { mode: 0o600 });

  const total = {
    posts: porPost.length,
    convertidos: indice.length,
    comErro: porPost.filter((item) => item.erro).length,
    porIdioma: porPost.reduce<Record<string, number>>((soma, item) => ({ ...soma, [item.idioma]: (soma[item.idioma] ?? 0) + 1 }), {}),
    datasConferidas: porPost.filter((item) => item.dataConferida).length,
    blocos: { paragrafos: 0, titulos: 0, itensDeLista: 0, citacoes: 0, imagens: 0 } as Record<string, number>,
    enfase: {} as Record<string, number>,
    formatacaoDescartada: {} as Record<string, number>,
    adaptados: {} as Record<string, number>,
    descartados: {} as Record<string, number>,
    links: { mantidos: 0, siteAntigoReescritos: 0, internosSemDestinoConhecido: 0, wixRemovidos: 0, httpRemovidos: 0, outrosRemovidos: 0 } as Record<string, number>,
    imagens: { noCorpo: 0, casadas: 0, capaNoCorpo: 0, capaRemovidaDoCorpo: 0, semIdDaMidia: 0, semUsoNoArquivo: 0, esperadasNaoAchadas: 0 } as Record<string, number>,
    postsComAviso: porPost.filter((item) => item.avisos.length > 0).length,
    postsComReferencias: porPost.filter((item) => item.temSecaoDeReferencias).length,
  };
  for (const item of porPost) {
    somarEm(total.blocos, item.blocos);
    somarEm(total.enfase, item.enfase);
    somarEm(total.formatacaoDescartada, item.formatacaoDescartada);
    somarEm(total.adaptados, item.adaptados);
    somarEm(total.descartados, item.descartados);
    for (const chave of Object.keys(total.links)) {
      const valor = item.links[chave as keyof typeof item.links];
      total.links[chave] += Array.isArray(valor) ? valor.length : valor;
    }
    for (const chave of Object.keys(total.imagens)) {
      const valor = item.imagens[chave as keyof typeof item.imagens];
      total.imagens[chave] += Array.isArray(valor) ? valor.length : valor;
    }
  }

  const tabela = (titulo: string, contagem: Record<string, number>) =>
    Object.keys(contagem).length ? [`| ${titulo} | Quantidade |`, "|---|---|", ...Object.entries(contagem).map(([chave, valor]) => `| ${chave} | ${valor} |`)].join("\n") : `${titulo}: nenhum.`;
  const markdown = [
    "# Conversão dos posts para Markdown restrito",
    "",
    `- Execução: ${execucao}`,
    `- Posts no mapa: ${total.posts}; convertidos: ${total.convertidos}; com erro: ${total.comErro}`,
    `- Idioma: ${Object.entries(total.porIdioma).map(([idioma, n]) => `${idioma} ${n}`).join(", ")}`,
    `- Datas de publicação conferidas com a página: ${total.datasConferidas} de ${total.posts}`,
    `- Posts com aviso de imagem: ${total.postsComAviso}; com seção de referências detectada: ${total.postsComReferencias}`,
    "",
    tabela("Blocos gerados", total.blocos),
    "",
    tabela("Imagens do corpo", total.imagens),
    "",
    `Imagens do corpo no Markdown: ${total.blocos.imagens} (${total.imagens.noCorpo} no site antigo, menos ${total.imagens.capaRemovidaDoCorpo} removidas por serem a capa e a primeira imagem do corpo, menos ${total.imagens.noCorpo - total.blocos.imagens - total.imagens.capaRemovidaDoCorpo} descartadas por outro motivo).`,
    "",
    `Primeira imagem do corpo removida por ser igual à capa (${porPost.filter((item) => item.imagens.capaRemovidaDoCorpo).length}): ${porPost.filter((item) => item.imagens.capaRemovidaDoCorpo).map((item) => item.slug).join(", ") || "nenhuma"}`,
    "",
    tabela("Ênfase", total.enfase),
    "",
    tabela("Links", total.links),
    "",
    tabela("Formatação que virou texto simples (o subconjunto não tem)", total.formatacaoDescartada),
    "",
    `Links em http removidos (texto mantido): lista em ${LINKS_HTTP}. Caminhos internos sem destino (texto mantido): lista em ${LINKS_INTERNOS}.`,
    "",
    tabela("Adaptados ao subconjunto", total.adaptados),
    "",
    tabela("Descartados", total.descartados),
    "",
    "## Para revisão (notas em sup e títulos h4 a h6)",
    "",
    ...(porPost.some((item) => item.paraRevisar.length) ? porPost.filter((item) => item.paraRevisar.length).map((item) => `- ${item.slug}: ${item.paraRevisar.join("; ")}`) : ["Nenhum."]),
    "",
    "## Por post",
    "",
    "| Slug | Idioma | Imagens (corpo, casadas, capa no corpo, capa removida) | Links removidos (Wix, http, internos sem destino, outros) | Adaptados | Descartados | Avisos |",
    "|---|---|---|---|---|---|---|",
    ...porPost.map((item) => {
      const adaptados = Object.values(item.adaptados).reduce((a, b) => a + b, 0);
      const descartados = Object.entries(item.descartados).map(([tag, n]) => `${tag} ${n}`).join(", ") || "-";
      return `| ${item.slug} | ${item.idioma} | ${item.imagens.noCorpo}, ${item.imagens.casadas}, ${item.imagens.capaNoCorpo}, ${item.imagens.capaRemovidaDoCorpo} | ${item.links.wixRemovidos}, ${item.links.httpRemovidos.length}, ${item.links.internosSemDestinoConhecido.length}, ${item.links.outrosRemovidos.length} | ${adaptados} | ${descartados} | ${item.erro ? `ERRO: ${item.erro}` : item.avisos.join(" ") || "-"} |`;
    }),
    "",
  ].join("\n");
  // O relatório em tmp-migracao/ leva só a quantidade de links removidos; o
  // endereço e o texto ficam nas listas de conferência, em docs/dados-privados/.
  const semTextoDosLinks = porPost.map((item) => ({ ...item, links: { ...item.links, httpRemovidos: item.links.httpRemovidos.length, internosSemDestinoConhecido: item.links.internosSemDestinoConhecido.length } }));
  const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `converter-posts-${execucao}`, { execucao, total, porPost: semTextoDosLinks }, markdown);
  const listaDeLinks = (titulo: string, explicacao: string, escolher: (item: (typeof porPost)[number]) => LinkRemovido[]) => {
    const linhasDaLista = porPost.flatMap((item) => escolher(item).map((link) => `| ${item.slug} | ${link.endereco.replace(/\|/g, "%7C")} | ${link.texto.replace(/\|/g, "/")} |`));
    return [`# ${titulo}`, "", `Gerado pela conversão ${execucao} (npm run migracao:converter-posts). ${explicacao}`, "", `Total: ${linhasDaLista.length}`, "", "| Post (slug antigo) | Endereço | Texto do link |", "|---|---|---|", ...linhasDaLista, ""].join("\n");
  };
  writeFileSync(LINKS_HTTP, listaDeLinks("Links em http removidos dos posts", "O link saiu e o texto ficou no post. Conferir à mão se existe versão em https; nenhum desses sites foi acessado.", (item) => item.links.httpRemovidos), { mode: 0o600 });
  writeFileSync(LINKS_INTERNOS, listaDeLinks("Links internos sem destino no site novo", "Caminhos do site antigo que não existem no site novo. O link saiu e o texto ficou no post, para religar quando houver página.", (item) => item.links.internosSemDestinoConhecido), { mode: 0o600 });

  console.log(`Posts no mapa: ${total.posts}; convertidos: ${total.convertidos}; com erro: ${total.comErro}`);
  console.log(`Idioma: ${JSON.stringify(total.porIdioma)}; datas conferidas: ${total.datasConferidas}`);
  console.log(`Em espanhol: ${porPost.filter((item) => item.idioma === "es").map((item) => item.slug).join(", ") || "nenhum"}`);
  console.log(`Imagens do corpo: ${JSON.stringify(total.imagens)}; no Markdown: ${total.blocos.imagens}`);
  console.log(`Ênfase: ${JSON.stringify(total.enfase)}`);
  console.log(`Links: ${JSON.stringify(total.links)}`);
  console.log(`Posts com aviso de imagem: ${total.postsComAviso}; com referências: ${total.postsComReferencias}`);
  console.log(`Para revisão: ${porPost.filter((item) => item.paraRevisar.length).length} post(s)`);
  console.log(`Markdown em: ${CONVERTIDOS}/`);
  console.log(`Listas de links: ${LINKS_HTTP} e ${LINKS_INTERNOS}`);
  console.log(`Relatório: ${caminhos.md}`);
}

function vazio(): Omit<RelatorioDaConversao, "avisos"> & { avisos: string[] } {
  return {
    blocos: { paragrafos: 0, titulos: 0, itensDeLista: 0, citacoes: 0, imagens: 0 },
    enfase: { negrito: 0, italico: 0, aninhadaSimplificada: 0, emTitulo: 0, emLinkSimplificada: 0, coladaSimplificada: 0 },
    formatacaoDescartada: {},
    adaptados: {},
    descartados: {},
    links: { mantidos: 0, siteAntigoReescritos: 0, internosSemDestinoConhecido: [], wixRemovidos: 0, httpRemovidos: [], outrosRemovidos: [] },
    imagens: { noCorpo: 0, casadas: 0, capaNoCorpo: 0, capaRemovidaDoCorpo: 0, semIdDaMidia: 0, semUsoNoArquivo: [], esperadasNaoAchadas: [] },
    paraRevisar: [],
    avisos: [],
    temSecaoDeReferencias: false,
  };
}

principal();
