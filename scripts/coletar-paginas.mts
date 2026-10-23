// Coleta das páginas institucionais do site antigo (etapa 6, degrau 6):
// guarda só o conteúdo principal (<main>) de cada página do mapa, menos home,
// doação, contato, cartilha e agendamento, que só entram no relatório. Não
// toca o Firebase e não importa nada.
//
// Uso:
//   npm run migracao:coletar-paginas                          só lista as páginas que leria (padrão, sem rede)
//   npm run migracao:coletar-paginas -- --executar [--limite=N]   lê o robots.txt e as páginas (GET)
//
// Rede (src/lib/migracao/rede.ts): só GET e HTTPS em www.abteescoliose.com.br
// (host fixo), uma página por vez, pausa mínima de 1 s, 30 s de limite, 25 MB,
// 2 novas tentativas só em erro 5xx, User-Agent da ABTE. 403 ou 429 param a
// coleta inteira. Página que o robots.txt não permite não é lida. Saída em
// docs/dados-privados/paginas-coletadas/ (fora do Git): {nome}.html (só o
// <main>) e indice.json.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lerArgumentos } from "../src/lib/migracao/execucao.ts";
import { lerPaginaDoSite, lerPaginasDoMapa, nomeDoArquivoDaPagina, permitidoPeloRobots } from "../src/lib/migracao/paginasColeta.ts";
import { ErroDeRede, criarClienteDeRede } from "../src/lib/migracao/rede.ts";

const ORIGEM_DO_SITE_ANTIGO = "https://www.abteescoliose.com.br";
const MAPA_PADRAO = "docs/dados-privados/mapa-site-antigo.jsonl";
const PASTA = "docs/dados-privados/paginas-coletadas";

function parar(mensagem: string): never {
  console.error(mensagem);
  process.exit(1);
}

async function principal() {
  const lidos = lerArgumentos(process.argv.slice(2));
  if (!lidos.ok) parar(`${lidos.mensagem} Nada foi feito.`);
  const args = lidos.argumentos;
  if (args.desfazer || args.confirmoProjeto || args.tipo || args.entrada || args.uid || args.incluirEditadas) parar("Este script aceita só --executar, --limite e --mapa. Nada foi feito.");

  let conteudo: string;
  try {
    conteudo = readFileSync(args.mapa ?? MAPA_PADRAO, "utf8");
  } catch {
    parar(`Arquivo não encontrado: ${args.mapa ?? MAPA_PADRAO}. Nada foi feito.`);
  }
  const mapa = lerPaginasDoMapa(conteudo);
  if (!mapa.ok) parar(`Mapa recusado:\n${mapa.erros.map((erro) => `  ${erro}`).join("\n")}`);
  const aLer = mapa.paginas.filter((pagina) => pagina.lida);
  const paginas = args.limite === null ? aLer : aLer.slice(0, args.limite);

  console.log(`Site: ${ORIGEM_DO_SITE_ANTIGO}`);
  console.log(`Modo: ${args.modo === "executar" ? "LER AS PÁGINAS (GET)" : "só listar (sem rede)"}`);
  console.log(`Páginas no mapa: ${mapa.paginas.length}; a ler: ${paginas.length}; só no relatório: ${mapa.paginas.length - aLer.length}`);
  for (const pagina of paginas) console.log(`  ${pagina.caminho}`);
  if (args.modo !== "executar") {
    console.log("\nNada foi lido. Para ler, repita com --executar.");
    return;
  }

  mkdirSync(PASTA, { recursive: true });
  const rede = criarClienteDeRede({ origem: ORIGEM_DO_SITE_ANTIGO });
  let robots = "";
  try {
    robots = new TextDecoder().decode((await rede.baixar("/robots.txt")).bytes);
  } catch (erro) {
    if (erro instanceof ErroDeRede && erro.tipo === "bloqueio") parar(`${erro.message} Coleta interrompida; nada foi contornado.`);
    if (!(erro instanceof ErroDeRede && erro.tipo === "naoEncontrado")) parar(`Não foi possível ler o robots.txt (${erro instanceof Error ? erro.message : String(erro)}). Nada foi lido.`);
  }
  const indice: Record<string, unknown>[] = [];
  let interrompido: string | null = null;
  for (const [i, pagina] of paginas.entries()) {
    const nome = nomeDoArquivoDaPagina(pagina.caminho);
    if (!permitidoPeloRobots(robots, pagina.caminho)) {
      indice.push({ caminho: pagina.caminho, nome, falha: "não permitida pelo robots.txt (não lida)" });
      console.log(`  ${i + 1}. ${pagina.caminho}: não permitida pelo robots.txt (não lida)`);
      continue;
    }
    try {
      const resposta = await rede.baixar(encodeURI(pagina.caminho));
      const lida = lerPaginaDoSite(new TextDecoder().decode(resposta.bytes));
      if (lida.conteudoHtml) writeFileSync(join(PASTA, `${nome}.html`), lida.conteudoHtml, { mode: 0o600 });
      indice.push({ caminho: pagina.caminho, nome, conteudoAchado: lida.conteudoHtml !== null, bytesDoConteudo: lida.conteudoHtml?.length ?? 0, titulo: lida.titulo, tituloIgualAoDoMapa: lida.titulo === pagina.tituloSite, descricaoMeta: lida.descricao });
      console.log(`  ${i + 1} de ${paginas.length}: ${pagina.caminho} (${lida.conteudoHtml ? "conteúdo achado" : "SEM <main>"})`);
    } catch (erro) {
      const motivo = erro instanceof ErroDeRede ? erro.message : `Falha inesperada: ${erro instanceof Error ? erro.message : String(erro)}`;
      indice.push({ caminho: pagina.caminho, nome, falha: motivo });
      console.log(`  ${i + 1}. FALHA: ${motivo}`);
      if (erro instanceof ErroDeRede && erro.tipo === "bloqueio") {
        interrompido = `${motivo} Coleta interrompida; nada foi contornado.`;
        break;
      }
    }
  }
  writeFileSync(
    join(PASTA, "indice.json"),
    `${JSON.stringify({ versao: 1, coletadoEm: new Date().toISOString(), origem: ORIGEM_DO_SITE_ANTIGO, pedidos: rede.pedidos, robotsTxtLido: robots !== "", interrompido, paginas: indice }, null, 2)}\n`,
    { mode: 0o600 },
  );
  console.log(`\nPedidos ao site: ${rede.pedidos} (inclui o robots.txt)`);
  console.log(`Conteúdos achados: ${indice.filter((item) => item.conteudoAchado).length} de ${paginas.length}; falhas ou não lidas: ${indice.filter((item) => item.falha).length}`);
  console.log(`Gravado em: ${PASTA}/`);
  if (interrompido) parar(`INTERROMPIDA: ${interrompido}`);
}

principal().then(
  () => process.exit(0),
  (erro) => parar(`Falha na coleta: ${erro instanceof Error ? erro.message : String(erro)}`),
);
