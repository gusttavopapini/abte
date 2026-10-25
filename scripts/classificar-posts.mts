// Classificação inicial dos posts importados (25/10/2026): categorias
// neutras e editoriais por regras explícitas (src/lib/migracao/
// classificacaoRegras.ts), só nos posts com origem da migração e sem
// categoria. Ver src/lib/migracao/classificacao.ts.
//
// Uso:
//   npm run migracao:classificar                                     simulação (padrão)
//   npm run migracao:classificar -- --executar --confirmo-projeto=<id exibido> [--limite=N]
//   npm run migracao:classificar -- --desfazer --execucao=<id>       simulação da reversão
//   npm run migracao:classificar -- --desfazer --execucao=<id> --executar --confirmo-projeto=<id exibido>
//
// Por padrão SÓ SIMULA. A tabela por post (slug, categoria e motivo) vai só
// para docs/dados-privados/classificacao-posts.md (fora do Git); o terminal
// e o relatório em tmp-migracao/ levam só contagens e ids. Lê as credenciais
// do .env e do .env.local e nunca as exibe. Com FIRESTORE_EMULATOR_HOST
// definida, usa o emulador.
import { writeFileSync } from "node:fs";
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { classificarPosts, desfazerClassificacao, tabelaPrivadaEmMarkdown } from "../src/lib/migracao/classificacao.ts";
import { conferirProjeto, lerArgumentos, novoIdDeExecucao } from "../src/lib/migracao/execucao.ts";
import { PASTA_DA_SAIDA, adquirirTrava, gravarRelatorio } from "../src/lib/migracao/saida.ts";

const TABELA_PRIVADA = "docs/dados-privados/classificacao-posts.md";

let liberarTrava: (() => void) | null = null;

function parar(mensagem: string): never {
  console.error(mensagem);
  liberarTrava?.();
  process.exit(1);
}

function iniciar(projectId: string, emulador: boolean): App {
  if (emulador) return initializeApp({ projectId }, "classificar-posts");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) parar("Credenciais do Admin SDK ausentes no .env.local (FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "classificar-posts");
}

async function principal() {
  const lidos = lerArgumentos(process.argv.slice(2));
  if (!lidos.ok) parar(`${lidos.mensagem} Nada foi feito.`);
  const args = lidos.argumentos;
  if (args.tipo !== null || args.uid !== null || args.entrada !== null || args.mapa !== null || args.incluirEditadas) parar("Este script não aceita --tipo, --uid, --entrada, --mapa nem --incluir-editadas. Nada foi feito.");

  const emulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const projeto = conferirProjeto({ projectId, emulador, modo: args.modo, confirmoProjeto: args.confirmoProjeto });
  if (!projeto.ok) parar(projeto.mensagem);

  const execucao = novoIdDeExecucao(new Date());
  console.log(`Projeto: ${projectId}${emulador ? " (emulador)" : ""}`);
  console.log(`Modo: ${args.modo === "executar" ? "EXECUTAR (grava)" : "simulação (não grava nada no Firebase)"}${args.desfazer ? ", desfazer" : ""}`);
  console.log(`Execução: ${execucao}`);

  const trava = adquirirTrava(PASTA_DA_SAIDA, "classificar-posts");
  if (!trava.ok) parar(`Outra execução está em andamento ou parou no meio (${trava.caminho}). Confira e apague a trava antes de repetir.`);
  liberarTrava = trava.liberar;
  try {
    const db = getFirestore(iniciar(projectId as string, emulador));

    if (args.desfazer) {
      const relatorio = await desfazerClassificacao({ db, execucaoAlvo: args.execucao as string, execucao, modo: args.modo });
      const c = relatorio.contagens;
      const markdown = [
        `# Reversão da classificação ${relatorio.execucaoDesfeita}: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
        "",
        `Projeto: ${projectId}. Posts que voltam a ficar sem categoria: ${c.postsQueVoltam}; categorias que saem: ${c.categoriasQueSaem}; pulados: ${c.pulados}.`,
        "",
        ...relatorio.pulados.map((item) => `- ${item.colecao}/${item.id}: ${item.motivo}`),
        "",
      ].join("\n");
      const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `classificar-posts-desfazer-${execucao}`, relatorio, markdown);
      console.log(`\nPosts que voltam a ficar sem categoria: ${c.postsQueVoltam}`);
      console.log(`Categorias que saem: ${c.categoriasQueSaem}`);
      console.log(`Pulados: ${c.pulados}`);
      console.log(`Relatório: ${caminhos.md}`);
      return;
    }

    const resultado = await classificarPosts({ db, modo: args.modo, execucao, limite: args.limite });
    if (!resultado.ok) parar(resultado.mensagem);
    const { relatorio, linhasPrivadas } = resultado;
    const c = relatorio.contagens;
    writeFileSync(TABELA_PRIVADA, tabelaPrivadaEmMarkdown(linhasPrivadas, execucao, args.modo), { mode: 0o600 });
    const markdown = [
      `# Classificação dos posts: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
      "",
      `- Execução: ${execucao}`,
      `- Projeto: ${projectId}`,
      `- Desfazer: npm run migracao:classificar -- --desfazer --execucao=${execucao}`,
      "",
      `Posts importados ${c.postsImportados}; já com categoria ${c.jaComCategoria}; candidatos ${c.candidatos}; nesta execução ${c.nestaExecucao}; classificados ${c.classificados}. Categorias a criar ${c.categoriasACriar}; criadas ${c.categoriasCriadas}.`,
      "",
      "| Categoria | Posts |",
      "|---|---|",
      ...Object.entries(c.porCategoria).map(([slug, n]) => `| ${slug} | ${n} |`),
      "",
      `Regra que decidiu: ${Object.entries(c.porOrigemDaRegra).map(([origem, n]) => `${origem} ${n}`).join("; ")}.`,
      "",
    ].join("\n");
    const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `classificar-posts-${execucao}`, relatorio, markdown);
    console.log(`\nPosts importados: ${c.postsImportados}; já com categoria: ${c.jaComCategoria}; nesta execução: ${c.nestaExecucao}; classificados: ${c.classificados}`);
    console.log(`Categorias a criar: ${c.categoriasACriar}; criadas: ${c.categoriasCriadas}`);
    for (const [slug, n] of Object.entries(c.porCategoria)) console.log(`  ${slug}: ${n}`);
    console.log(`Regra que decidiu: ${Object.entries(c.porOrigemDaRegra).map(([origem, n]) => `${origem} ${n}`).join("; ")}`);
    console.log(`Tabela por post (privada): ${TABELA_PRIVADA}`);
    console.log(`Relatório: ${caminhos.md}`);
    if (args.modo === "executar") console.log(`Desfazer: npm run migracao:classificar -- --desfazer --execucao=${execucao}`);
  } finally {
    liberarTrava?.();
  }
}

principal().then(
  () => process.exit(0),
  (erro) => parar(`Falha na classificação: ${erro instanceof Error ? erro.message : String(erro)}`),
);
