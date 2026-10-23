// Converte as páginas institucionais coletadas do site antigo para o Markdown
// restrito (etapa 6, degrau 6), só com arquivos locais e só para
// conferência: NADA é importado nem gravado no Firebase.
//
// Uso:
//   npm run migracao:converter-paginas
//
// Entradas (fora do Git): docs/dados-privados/mapa-site-antigo.jsonl,
// imagens-origem.json e paginas-coletadas/ (npm run migracao:coletar-paginas).
// Saídas (fora do Git): docs/dados-privados/paginas/{caminho}.md e
// indice.json, docs/dados-privados/pendencias-paginas.md (números oficiais,
// Pix e formulários de associação que não entraram, para a ABTE) e o
// relatório em tmp-migracao/, só com caminhos e contagens.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { novoIdDeExecucao } from "../src/lib/migracao/execucao.ts";
import { validarImagensOrigem } from "../src/lib/migracao/imagensOrigem.ts";
import { lerPaginasDoMapa, nomeDoArquivoDaPagina } from "../src/lib/migracao/paginasColeta.ts";
import { cabecalhoDaPagina, converterPagina, type RelatorioDaPagina } from "../src/lib/migracao/paginasConversao.ts";
import { PASTA_DA_SAIDA, gravarRelatorio } from "../src/lib/migracao/saida.ts";

const MAPA = "docs/dados-privados/mapa-site-antigo.jsonl";
const IMAGENS = "docs/dados-privados/imagens-origem.json";
const COLETADAS = "docs/dados-privados/paginas-coletadas";
const SAIDA = "docs/dados-privados/paginas";
const PENDENCIAS = "docs/dados-privados/pendencias-paginas.md";

function parar(mensagem: string): never {
  console.error(mensagem);
  process.exit(1);
}

function principal() {
  if (process.argv.length > 2) parar("Este script não aceita argumentos. Nada foi feito.");
  const mapa = lerPaginasDoMapa(readFileSync(MAPA, "utf8"));
  if (!mapa.ok) parar(`Mapa recusado:\n${mapa.erros.map((erro) => `  ${erro}`).join("\n")}`);
  const imagens = validarImagensOrigem(JSON.parse(readFileSync(IMAGENS, "utf8")));
  if (!imagens.ok) parar(`imagens-origem.json recusado (${imagens.erros.length} problema(s)). Nada foi feito.`);
  const conhecidas = new Set(imagens.imagens.map((imagem) => imagem.midiaIdWix));
  if (!existsSync(join(COLETADAS, "indice.json"))) parar(`Sem coleta em ${COLETADAS}/. Rode antes npm run migracao:coletar-paginas -- --executar. Nada foi feito.`);

  mkdirSync(SAIDA, { recursive: true });
  const execucao = novoIdDeExecucao(new Date());
  const convertidas: { caminho: string; arquivo: string; relatorio: RelatorioDaPagina; caracteres: number }[] = [];
  const faltando: string[] = [];
  for (const pagina of mapa.paginas.filter((item) => item.lida)) {
    const nome = nomeDoArquivoDaPagina(pagina.caminho);
    const origem = join(COLETADAS, `${nome}.html`);
    if (!existsSync(origem)) {
      faltando.push(pagina.caminho);
      continue;
    }
    const { markdown, relatorio } = converterPagina(readFileSync(origem, "utf8"), conhecidas);
    const arquivo = join(SAIDA, `${nome}.md`);
    writeFileSync(arquivo, `${cabecalhoDaPagina(pagina.caminho, pagina.tituloSite)}${markdown}`, { mode: 0o600 });
    convertidas.push({ caminho: pagina.caminho, arquivo, relatorio, caracteres: markdown.length });
  }
  const soNoRelatorio = mapa.paginas.filter((item) => !item.lida);
  writeFileSync(join(SAIDA, "indice.json"), `${JSON.stringify({ versao: 1, convertidoEm: new Date().toISOString(), paginas: convertidas.map((item) => ({ caminho: item.caminho, arquivo: item.arquivo, caracteres: item.caracteres })) }, null, 2)}\n`, { mode: 0o600 });

  const pendencias = convertidas.flatMap((item) => item.relatorio.pendencias.map((pendencia) => ({ caminho: item.caminho, ...pendencia })));
  writeFileSync(
    PENDENCIAS,
    [
      "# Pendências das páginas do site antigo para a ABTE",
      "",
      "Gerado por `npm run migracao:converter-paginas` (fora do Git). Números oficiais, Pix e formulários de associação NÃO entraram nos arquivos de `paginas/` (pedido de 22/10/2026); os outros formulários (ex.: inscrição por e-mail) também não. Cada linha diz onde estava (página e posição do bloco no Markdown convertido, antes da retirada); o texto não é copiado aqui. A ABTE confirma os números, os dados do Pix (decisão P1) e a forma de associação (decisão P8).",
      "",
      "| Página | Tipo | Bloco | O que era |",
      "|---|---|---|---|",
      ...pendencias.map((item) => `| ${item.caminho} | ${item.tipo} | ${item.bloco || "-"} | ${item.descricao} |`),
      "",
      "## Pendências gerais para a ABTE",
      "",
      `Nas ${convertidas.length} páginas lidas, a conversão achou ${pendencias.filter((p) => p.tipo === "numero").length} bloco(s) de número da instituição, ${pendencias.filter((p) => p.tipo === "pix").length} de Pix e ${pendencias.filter((p) => p.tipo === "associacao").length} de associação. Seguem pendentes, de qualquer forma: os números oficiais (decisão em aberto), os dados do Pix (P1) e a forma de associação (P8). Home, doação, contato, cartilha e agendamento não foram lidas.`,
      "",
      `Parágrafos que ficaram e têm um número com o que ele conta (conferir se algum é número oficial): ${convertidas.reduce((soma, item) => soma + item.relatorio.paragrafosComNumero, 0)}.`,
      "",
      "## Páginas não lidas (só o que o mapa diz delas)",
      "",
      "| Página | Título no site antigo | Caracteres | Imagens | Links |",
      "|---|---|---|---|---|",
      ...soNoRelatorio.map((pagina) => `| ${pagina.caminho} | ${pagina.tituloSite.split("|")[0].trim()} | ${pagina.caracteres ?? "-"} | ${pagina.imagens ?? "-"} | ${pagina.links ?? "-"} |`),
      "",
    ].join("\n"),
    { mode: 0o600 },
  );

  const resumo = convertidas.map((item) => {
    const c = item.relatorio.conversao;
    return {
      caminho: item.caminho,
      caracteres: item.caracteres,
      blocosDeTexto: item.relatorio.blocosDeTexto,
      titulos: c.blocos.titulos,
      paragrafos: c.blocos.paragrafos,
      itensDeLista: c.blocos.itensDeLista,
      imagens: { soltas: item.relatorio.imagensSoltas, noMarkdown: c.blocos.imagens, foraDoArquivo: c.imagens.semUsoNoArquivo.length + c.imagens.semIdDaMidia },
      botoes: item.relatorio.botoes,
      caracteresForaDosBlocos: item.relatorio.caracteresForaDosBlocos,
      formularios: item.relatorio.formularios,
      links: { mantidos: c.links.mantidos, siteAntigoReescritos: c.links.siteAntigoReescritos, internosSemDestino: c.links.internosSemDestinoConhecido.length, http: c.links.httpRemovidos.length, wix: c.links.wixRemovidos, outros: c.links.outrosRemovidos.length },
      pendencias: { numero: item.relatorio.pendencias.filter((p) => p.tipo === "numero").length, pix: item.relatorio.pendencias.filter((p) => p.tipo === "pix").length, associacao: item.relatorio.pendencias.filter((p) => p.tipo === "associacao").length, formulario: item.relatorio.pendencias.filter((p) => p.tipo === "formulario").length },
      paragrafosComNumero: item.relatorio.paragrafosComNumero,
      paraRevisar: c.paraRevisar.length,
    };
  });
  const relatorio = { script: "converter-paginas", execucao, convertidas: resumo, faltando, soNoRelatorio: soNoRelatorio.map((pagina) => pagina.caminho) };
  const markdown = [
    "# Conversão das páginas do site antigo (só conferência, nada importado)",
    "",
    `- Execução: ${execucao}`,
    `- Convertidas: ${convertidas.length}; sem coleta: ${faltando.length}; não lidas (só no relatório): ${soNoRelatorio.length} (${soNoRelatorio.map((pagina) => pagina.caminho).join(", ")})`,
    `- Pendências para a ABTE (em ${PENDENCIAS}): números ${pendencias.filter((p) => p.tipo === "numero").length}, Pix ${pendencias.filter((p) => p.tipo === "pix").length}, associação ${pendencias.filter((p) => p.tipo === "associacao").length}, outros formulários ${pendencias.filter((p) => p.tipo === "formulario").length}`,
    "",
    "| Página | Caracteres | Títulos | Parágrafos | Itens | Imagens (soltas / no Markdown / fora do arquivo) | Botões e links com texto | Texto fora dos blocos (caracteres, não convertido) | Formulários | Links (mantidos / reescritos / sem destino / http / Wix / outros) | Pendências (número / Pix / associação / outro formulário) | Parágrafos com número | Para revisar |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...resumo.map(
      (item) =>
        `| ${item.caminho} | ${item.caracteres} | ${item.titulos} | ${item.paragrafos} | ${item.itensDeLista} | ${item.imagens.soltas} / ${item.imagens.noMarkdown} / ${item.imagens.foraDoArquivo} | ${item.botoes} | ${item.caracteresForaDosBlocos} | ${item.formularios} | ${item.links.mantidos} / ${item.links.siteAntigoReescritos} / ${item.links.internosSemDestino} / ${item.links.http} / ${item.links.wix} / ${item.links.outros} | ${item.pendencias.numero} / ${item.pendencias.pix} / ${item.pendencias.associacao} / ${item.pendencias.formulario} | ${item.paragrafosComNumero} | ${item.paraRevisar} |`,
    ),
    "",
  ].join("\n");
  const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `converter-paginas-${execucao}`, relatorio, markdown);
  console.log(`Páginas convertidas: ${convertidas.length}; sem coleta: ${faltando.length}; não lidas: ${soNoRelatorio.length}`);
  console.log(`Pendências: números ${pendencias.filter((p) => p.tipo === "numero").length}, Pix ${pendencias.filter((p) => p.tipo === "pix").length}, associação ${pendencias.filter((p) => p.tipo === "associacao").length}, outros formulários ${pendencias.filter((p) => p.tipo === "formulario").length}`);
  console.log(`Markdown em: ${SAIDA}/`);
  console.log(`Relatório: ${caminhos.md}`);
}

principal();
