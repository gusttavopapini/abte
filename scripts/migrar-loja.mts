// Migração das categorias e dos produtos da loja do site antigo (etapa 6,
// degrau 3). Todos os produtos com publicado = false; a loja continua vitrine
// "Em breve", sem pagamento, carrinho ou checkout novos.
//
// Uso:
//   npm run migracao:loja                                     simulação (padrão)
//   npm run migracao:loja -- --executar --confirmo-projeto=<id exibido> [--limite=N]
//   npm run migracao:loja -- --desfazer --execucao=<id>       simulação da reversão
//   npm run migracao:loja -- --desfazer --execucao=<id> --executar --confirmo-projeto=<id exibido>
//   (com --incluir-editadas, os alterados por pessoa também saem: rode antes a
//   simulação e confirme com --confirmo-apagar-editadas=<quantidade mostrada>)
//
// Por padrão SÓ SIMULA: lê os arquivos e as coleções midias, produtos e
// categoriasDeProdutos, sem gravar no Firebase. Gravar exige --executar E
// --confirmo-projeto com o id do projeto exibido (da lista
// PROJETOS_PERMITIDOS) e a migração das imagens já executada.
//
// Entradas (fora do Git, em docs/dados-privados/): mapa-site-antigo.jsonl
// (--mapa), imagens-origem.json e produtos-coletados.json (a coleta das
// páginas: npm run migracao:coletar-produtos). Saídas em tmp-migracao/ (fora
// do Git): o relatório e a tabela PROPOSTA de redirecionamentos
// (redirects.json, nada ativado). Lê as credenciais do .env e do .env.local
// e nunca as exibe. Com FIRESTORE_EMULATOR_HOST definida, usa o emulador.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { conferirProjeto, lerArgumentos, novoIdDeExecucao } from "../src/lib/migracao/execucao.ts";
import { validarImagensOrigem } from "../src/lib/migracao/imagensOrigem.ts";
import { desfazerLoja, migrarLoja, relatorioDaLojaEmMarkdown } from "../src/lib/migracao/loja.ts";
import { juntarRedirecionamentos, lerProdutosColetados, lerProdutosDoMapa, type ProdutoColetado } from "../src/lib/migracao/produtos.ts";
import { PASTA_DA_SAIDA, adquirirTrava, gravarRelatorio } from "../src/lib/migracao/saida.ts";

const MAPA_PADRAO = "docs/dados-privados/mapa-site-antigo.jsonl";
const IMAGENS = "docs/dados-privados/imagens-origem.json";
const COLETA = "docs/dados-privados/produtos-coletados.json";
const REDIRECTS = join(PASTA_DA_SAIDA, "redirects.json");

// A trava é liberada antes de sair, inclusive quando o script para no meio.
let liberarTrava: (() => void) | null = null;

function parar(mensagem: string): never {
  console.error(mensagem);
  liberarTrava?.();
  process.exit(1);
}

function iniciar(projectId: string, emulador: boolean): App {
  if (emulador) return initializeApp({ projectId }, "migrar-loja");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) parar("Credenciais do Admin SDK ausentes no .env.local (FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "migrar-loja");
}

function lerJson(caminho: string): unknown {
  try {
    return JSON.parse(readFileSync(caminho, "utf8"));
  } catch {
    parar(`Arquivo não encontrado ou não é JSON: ${caminho}. Nada foi feito.`);
  }
}

async function principal() {
  const lidos = lerArgumentos(process.argv.slice(2));
  if (!lidos.ok) parar(`${lidos.mensagem} Nada foi feito.`);
  const args = lidos.argumentos;
  if (args.tipo !== null || args.uid !== null || args.entrada !== null) parar("Este script não aceita --tipo, --uid nem --entrada. Nada foi feito.");

  const emulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const projeto = conferirProjeto({ projectId, emulador, modo: args.modo, confirmoProjeto: args.confirmoProjeto });
  if (!projeto.ok) parar(projeto.mensagem);

  const execucao = novoIdDeExecucao(new Date());
  console.log(`Projeto: ${projectId}${emulador ? " (emulador)" : ""}`);
  console.log(`Modo: ${args.modo === "executar" ? "EXECUTAR (grava)" : "simulação (não grava nada no Firebase)"}${args.desfazer ? ", desfazer" : ""}`);
  console.log(`Execução: ${execucao}`);

  const trava = adquirirTrava(PASTA_DA_SAIDA, "migrar-loja");
  if (!trava.ok) parar(`Outra execução está em andamento ou parou no meio (${trava.caminho}). Confira e apague a trava antes de repetir.`);
  liberarTrava = trava.liberar;
  try {
    const db = getFirestore(iniciar(projectId as string, emulador));

    if (args.desfazer) {
      const relatorio = await desfazerLoja({ db, execucaoAlvo: args.execucao as string, execucao, modo: args.modo, incluirEditados: args.incluirEditadas, confirmacaoDeEditados: args.confirmoApagarEditadas });
      const markdown = [
        `# Reversão da execução ${relatorio.execucaoDesfeita} (loja): ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
        "",
        `Projeto: ${projectId}. Encontrados: ${relatorio.contagens.encontrados}; ${relatorio.modo === "simulacao" ? "seriam desfeitos" : "desfeitos"}: ${relatorio.contagens.desfeitos}; pulados: ${relatorio.contagens.pulados}.`,
        `Alterados por uma pessoa que sairiam (só com --incluir-editadas): ${relatorio.contagens.editadosPorPessoaQueSairiam}.`,
        relatorio.bloqueado ? `**${relatorio.bloqueado}**` : "",
        "",
        ...relatorio.pulados.map((item) => `- ${item.colecao}/${item.id}: ${item.motivo}`),
        "",
      ].join("\n");
      const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `migrar-loja-desfazer-${execucao}`, relatorio, markdown);
      console.log(`\nEncontrados: ${relatorio.contagens.encontrados}`);
      console.log(`${args.modo === "simulacao" ? "Seriam desfeitos" : "Desfeitos"}: ${relatorio.contagens.desfeitos}`);
      console.log(`Pulados: ${relatorio.contagens.pulados}`);
      if (args.incluirEditadas) console.log(`Alterados por uma pessoa que sairiam: ${relatorio.contagens.editadosPorPessoaQueSairiam}`);
      console.log(`Relatório: ${caminhos.md}`);
      if (relatorio.bloqueado) parar(relatorio.bloqueado);
      return;
    }

    let conteudoDoMapa: string;
    try {
      conteudoDoMapa = readFileSync(args.mapa ?? MAPA_PADRAO, "utf8");
    } catch {
      parar(`Arquivo não encontrado: ${args.mapa ?? MAPA_PADRAO}. Nada foi feito.`);
    }
    const mapa = lerProdutosDoMapa(conteudoDoMapa);
    if (!mapa.ok) parar(`Mapa recusado:\n${mapa.erros.map((erro) => `  ${erro}`).join("\n")}\nNada foi feito.`);
    const imagens = validarImagensOrigem(lerJson(IMAGENS));
    if (!imagens.ok) parar(`imagens-origem.json recusado (${imagens.erros.length} problema(s)). Nada foi feito.`);
    let coletados = new Map<string, ProdutoColetado>();
    if (existsSync(COLETA)) {
      const coleta = lerProdutosColetados(lerJson(COLETA));
      if (!coleta.ok) parar(`${coleta.erros.join(" ")} Nada foi feito.`);
      coletados = coleta.porSlug;
    } else console.log(`AVISO: ${COLETA} não existe; as descrições virão do mapa (aproximadas) e irão para revisão.`);

    const relatorio = await migrarLoja({ db, produtos: mapa.produtos, categoriasDoMapa: mapa.categorias, coletados, imagensDeOrigem: imagens.imagens, modo: args.modo, execucao, limite: args.limite });
    if (!relatorio.ok) parar(relatorio.mensagem);
    const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `migrar-loja-${execucao}`, relatorio, relatorioDaLojaEmMarkdown(relatorio, String(projectId)));
    const tabela = juntarRedirecionamentos(existsSync(REDIRECTS) ? JSON.parse(readFileSync(REDIRECTS, "utf8")) : null, relatorio.redirecionamentos, new Date().toISOString());
    writeFileSync(REDIRECTS, `${JSON.stringify(tabela, null, 2)}\n`, { mode: 0o600 });

    const c = relatorio.contagens;
    console.log(`\nCategorias: ${c.categorias.previstas} previstas; ${c.categorias.jaExistentes} já existentes; ${c.categorias.criadas} criadas`);
    console.log(`Produtos: ${c.produtos.previstos} previstos; ${c.produtos.jaExistentes} já existentes; ${c.produtos.nestaExecucao} nesta execução; ${c.produtos.criados} criados`);
    console.log(`Com preço riscado: ${c.comPrecoRiscado}; descrição lida na página: ${c.descricaoLidaNaPagina}`);
    if (relatorio.conflitos.length) console.log(`CONFLITOS: ${relatorio.conflitos.join(" ")}`);
    console.log(`Relatório: ${caminhos.md}`);
    console.log(`Redirecionamentos (NÃO ativados): ${REDIRECTS}`);
  } finally {
    liberarTrava?.();
  }
}

principal().then(
  () => process.exit(0),
  (erro) => parar(`Falha na migração: ${erro instanceof Error ? erro.message : String(erro)}`),
);
