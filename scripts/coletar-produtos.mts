// Coleta das páginas de produto do site antigo (etapa 6, degrau 3): descrição
// como está na página, opções (variações), campos de texto do cliente, preço
// e estoque mostrados (estes três só como referência). Não toca o Firebase.
//
// Uso:
//   npm run migracao:coletar-produtos                       só lista as páginas que leria (padrão, sem rede)
//   npm run migracao:coletar-produtos -- --executar [--limite=N]   lê as páginas (GET)
//
// Rede (src/lib/migracao/rede.ts): só GET e HTTPS em www.abteescoliose.com.br
// (host fixo), uma página por vez, pausa mínima de 1 s, 30 s de limite, 25 MB,
// 2 novas tentativas só em erro 5xx, User-Agent da ABTE. 403 ou 429 param a
// coleta inteira. O HTML não é guardado; só o que foi lido vai para
// docs/dados-privados/produtos-coletados.json (fora do Git).
import { readFileSync, writeFileSync } from "node:fs";
import { lerArgumentos } from "../src/lib/migracao/execucao.ts";
import { caminhoDaPaginaAntiga, lerProdutosDoMapa } from "../src/lib/migracao/produtos.ts";
import { lerPaginaDeProduto } from "../src/lib/migracao/produtosColeta.ts";
import { ErroDeRede, criarClienteDeRede } from "../src/lib/migracao/rede.ts";

const ORIGEM_DO_SITE_ANTIGO = "https://www.abteescoliose.com.br";
const MAPA_PADRAO = "docs/dados-privados/mapa-site-antigo.jsonl";
const SAIDA = "docs/dados-privados/produtos-coletados.json";

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
  const mapa = lerProdutosDoMapa(conteudo);
  if (!mapa.ok) parar(`Mapa recusado:\n${mapa.erros.map((erro) => `  ${erro}`).join("\n")}`);
  const produtos = args.limite === null ? mapa.produtos : mapa.produtos.slice(0, args.limite);

  console.log(`Site: ${ORIGEM_DO_SITE_ANTIGO}`);
  console.log(`Modo: ${args.modo === "executar" ? "LER AS PÁGINAS (GET)" : "só listar (sem rede)"}`);
  console.log(`Páginas: ${produtos.length} de ${mapa.produtos.length}`);
  if (args.modo !== "executar") {
    produtos.forEach((produto, i) => console.log(`  ${i + 1}. ${caminhoDaPaginaAntiga(produto.slug)}`));
    console.log("\nNada foi lido. Para ler, repita com --executar.");
    return;
  }

  const rede = criarClienteDeRede({ origem: ORIGEM_DO_SITE_ANTIGO });
  const coletados: Record<string, unknown>[] = [];
  let interrompido: string | null = null;
  for (const [i, produto] of produtos.entries()) {
    const caminho = caminhoDaPaginaAntiga(produto.slug);
    try {
      const resposta = await rede.baixar(caminho);
      const lido = lerPaginaDeProduto(new TextDecoder().decode(resposta.bytes), produto.slug);
      coletados.push({ slug: produto.slug, caminho, ...lido });
      const a = lido.achados;
      console.log(
        `  ${i + 1}. descrição: ${a.descricaoNoElemento ? "achada no elemento" : a.ldJsonProduto ? "só no ld+json" : "NÃO ACHADA"}` +
          ` (${lido.descricao?.length ?? 0} caracteres) | dados do Wix: ${a.dadosDoWix ? "sim" : "NÃO"}` +
          ` | opções: ${lido.opcoes?.length ?? "?"} | campos de texto: ${lido.camposDeTexto?.length ?? "?"}`,
      );
    } catch (erro) {
      const motivo = erro instanceof ErroDeRede ? erro.message : `Falha inesperada: ${erro instanceof Error ? erro.message : String(erro)}`;
      coletados.push({ slug: produto.slug, caminho, falha: motivo });
      console.log(`  ${i + 1}. FALHA: ${motivo}`);
      if (erro instanceof ErroDeRede && erro.tipo === "bloqueio") {
        interrompido = `${motivo} Coleta interrompida; nada foi contornado.`;
        break;
      }
    }
  }
  const saida = { versao: 1, coletadoEm: new Date().toISOString(), origem: ORIGEM_DO_SITE_ANTIGO, pedidos: rede.pedidos, interrompido, produtos: coletados };
  writeFileSync(SAIDA, `${JSON.stringify(saida, null, 2)}\n`, { mode: 0o600 });
  console.log(`\nPedidos ao site: ${rede.pedidos}`);
  console.log(`Gravado em: ${SAIDA}`);
  if (interrompido) parar(`INTERROMPIDA: ${interrompido}`);
}

principal().then(
  () => process.exit(0),
  (erro) => parar(`Falha na coleta: ${erro instanceof Error ? erro.message : String(erro)}`),
);
