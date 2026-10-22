// Coleta das páginas dos posts do blog do site antigo (etapa 6, degrau 4a):
// guarda só o artigo (article data-hook="post") de cada post e a data de
// publicação. Não toca o Firebase.
//
// Uso:
//   npm run migracao:coletar-posts                        só lista as páginas que leria (padrão, sem rede)
//   npm run migracao:coletar-posts -- --executar [--limite=N]   lê as páginas (GET)
//
// Rede (src/lib/migracao/rede.ts): só GET e HTTPS em www.abteescoliose.com.br
// (host fixo), uma página por vez, pausa mínima de 1 s, 30 s de limite, 25 MB,
// 2 novas tentativas só em erro 5xx, User-Agent da ABTE. 403 ou 429 param a
// coleta inteira. Saída em docs/dados-privados/posts-coletados/ (fora do Git):
// um arquivo {slug}.html por post (só o artigo) e indice.json (datas e o que
// foi achado).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lerArgumentos } from "../src/lib/migracao/execucao.ts";
import { lerPostsDoMapa } from "../src/lib/migracao/postsConversao.ts";
import { lerPaginaDePost } from "../src/lib/migracao/postsColeta.ts";
import { ErroDeRede, criarClienteDeRede } from "../src/lib/migracao/rede.ts";

const ORIGEM_DO_SITE_ANTIGO = "https://www.abteescoliose.com.br";
const MAPA_PADRAO = "docs/dados-privados/mapa-site-antigo.jsonl";
const PASTA = "docs/dados-privados/posts-coletados";

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
  const mapa = lerPostsDoMapa(conteudo);
  if (!mapa.ok) parar(`Mapa recusado:\n${mapa.erros.map((erro) => `  ${erro}`).join("\n")}`);
  const posts = args.limite === null ? mapa.posts : mapa.posts.slice(0, args.limite);

  console.log(`Site: ${ORIGEM_DO_SITE_ANTIGO}`);
  console.log(`Modo: ${args.modo === "executar" ? "LER AS PÁGINAS (GET)" : "só listar (sem rede)"}`);
  console.log(`Páginas: ${posts.length} de ${mapa.posts.length} posts no mapa`);
  if (args.modo !== "executar") {
    console.log("\nNada foi lido. Para ler, repita com --executar.");
    return;
  }

  mkdirSync(PASTA, { recursive: true });
  const rede = criarClienteDeRede({ origem: ORIGEM_DO_SITE_ANTIGO });
  const indice: Record<string, unknown>[] = [];
  let interrompido: string | null = null;
  for (const [i, post] of posts.entries()) {
    const caminho = `/post/${encodeURIComponent(post.slug)}`;
    try {
      const resposta = await rede.baixar(caminho);
      const lido = lerPaginaDePost(new TextDecoder().decode(resposta.bytes));
      if (lido.artigoHtml) writeFileSync(join(PASTA, `${post.slug.normalize("NFC")}.html`), lido.artigoHtml, { mode: 0o600 });
      indice.push({
        slug: post.slug,
        caminho,
        artigoAchado: lido.artigoHtml !== null,
        bytesDoArtigo: lido.artigoHtml?.length ?? 0,
        tituloIgualAoDoMapa: lido.titulo === post.titulo,
        publicadoEmNaPagina: lido.publicadoEm,
        atualizadoEmNaPagina: lido.atualizadoEm,
        fonteDaData: lido.fonteDaData,
        publicadoEmNoMapa: post.publicadoEm,
        dataIgualAoMapa: lido.publicadoEm === post.publicadoEm,
      });
      if ((i + 1) % 10 === 0 || i + 1 === posts.length) console.log(`  ${i + 1} de ${posts.length}`);
    } catch (erro) {
      const motivo = erro instanceof ErroDeRede ? erro.message : `Falha inesperada: ${erro instanceof Error ? erro.message : String(erro)}`;
      indice.push({ slug: post.slug, caminho, falha: motivo });
      console.log(`  ${i + 1}. FALHA: ${motivo}`);
      if (erro instanceof ErroDeRede && erro.tipo === "bloqueio") {
        interrompido = `${motivo} Coleta interrompida; nada foi contornado.`;
        break;
      }
    }
  }
  writeFileSync(join(PASTA, "indice.json"), `${JSON.stringify({ versao: 1, coletadoEm: new Date().toISOString(), origem: ORIGEM_DO_SITE_ANTIGO, pedidos: rede.pedidos, interrompido, posts: indice }, null, 2)}\n`, { mode: 0o600 });
  const achados = indice.filter((item) => item.artigoAchado).length;
  console.log(`\nPedidos ao site: ${rede.pedidos}`);
  console.log(`Artigos achados: ${achados} de ${posts.length}; falhas: ${indice.filter((item) => item.falha).length}`);
  console.log(`Datas iguais às do mapa: ${indice.filter((item) => item.dataIgualAoMapa).length}; títulos iguais aos do mapa: ${indice.filter((item) => item.tituloIgualAoDoMapa).length}`);
  console.log(`Gravado em: ${PASTA}/`);
  if (interrompido) parar(`INTERROMPIDA: ${interrompido}`);
}

principal().then(
  () => process.exit(0),
  (erro) => parar(`Falha na coleta: ${erro instanceof Error ? erro.message : String(erro)}`),
);
