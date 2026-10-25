// Publicação do conteúdo importado do site antigo (etapa 6, exceção decidida
// em 24/10/2026): liga a visibilidade dos documentos com origem da migração,
// sem a conferência de menores e sem a revisão dos pontos marcados (ver
// src/lib/migracao/publicacao.ts e o CLAUDE.md).
//
// Uso:
//   npm run migracao:publicar -- --tipo=<tipo>                     simulação (padrão)
//   npm run migracao:publicar -- --tipo=<tipo> --executar --confirmo-projeto=<id exibido> [--limite=N]
//   npm run migracao:publicar -- --desfazer --execucao=<id>        simulação da reversão
//   npm run migracao:publicar -- --desfazer --execucao=<id> --executar --confirmo-projeto=<id exibido>
// Tipos: profissionais, produtos, posts, artigos, diretoria, categorias (um ou
// mais, separados por vírgula) ou todos.
//
// Por padrão SÓ SIMULA: lê as coleções e o logAlteracoes, sem gravar no
// Firebase. Gravar exige --executar E --confirmo-projeto com o id do projeto
// exibido (da lista PROJETOS_PERMITIDOS). Saída em tmp-migracao/ (fora do
// Git), só com ids e contagens. Lê as credenciais do .env e do .env.local e
// nunca as exibe. Com FIRESTORE_EMULATOR_HOST definida, usa o emulador.
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { conferirProjeto, lerArgumentos, novoIdDeExecucao } from "../src/lib/migracao/execucao.ts";
import { desfazerPublicacao, lerTiposDePublicacao, publicarMigracao, relatorioDaPublicacaoEmMarkdown } from "../src/lib/migracao/publicacao.ts";
import { PASTA_DA_SAIDA, adquirirTrava, gravarRelatorio } from "../src/lib/migracao/saida.ts";

// A trava é liberada antes de sair, inclusive quando o script para no meio.
let liberarTrava: (() => void) | null = null;

function parar(mensagem: string): never {
  console.error(mensagem);
  liberarTrava?.();
  process.exit(1);
}

function iniciar(projectId: string, emulador: boolean): App {
  if (emulador) return initializeApp({ projectId }, "publicar-migracao");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) parar("Credenciais do Admin SDK ausentes no .env.local (FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "publicar-migracao");
}

async function principal() {
  const lidos = lerArgumentos(process.argv.slice(2));
  if (!lidos.ok) parar(`${lidos.mensagem} Nada foi feito.`);
  const args = lidos.argumentos;
  if (args.uid !== null || args.entrada !== null || args.mapa !== null || args.incluirEditadas) parar("Este script não aceita --uid, --entrada, --mapa nem --incluir-editadas. Nada foi feito.");
  const tipos = args.desfazer ? null : lerTiposDePublicacao(args.tipo);
  if (tipos && !tipos.ok) parar(`${tipos.mensagem} Nada foi feito.`);

  const emulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const projeto = conferirProjeto({ projectId, emulador, modo: args.modo, confirmoProjeto: args.confirmoProjeto });
  if (!projeto.ok) parar(projeto.mensagem);

  const execucao = novoIdDeExecucao(new Date());
  console.log(`Projeto: ${projectId}${emulador ? " (emulador)" : ""}`);
  console.log(`Modo: ${args.modo === "executar" ? "EXECUTAR (grava)" : "simulação (não grava nada no Firebase)"}${args.desfazer ? ", desfazer" : ""}`);
  console.log(`Execução: ${execucao}`);

  const trava = adquirirTrava(PASTA_DA_SAIDA, "publicar-migracao");
  if (!trava.ok) parar(`Outra execução está em andamento ou parou no meio (${trava.caminho}). Confira e apague a trava antes de repetir.`);
  liberarTrava = trava.liberar;
  try {
    const db = getFirestore(iniciar(projectId as string, emulador));

    if (args.desfazer) {
      const relatorio = await desfazerPublicacao({ db, execucaoAlvo: args.execucao as string, execucao, modo: args.modo });
      const c = relatorio.contagens;
      const markdown = [
        `# Reversão da publicação ${relatorio.execucaoDesfeita}: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
        "",
        `Projeto: ${projectId}. Registros da publicação: ${c.encontrados}; ${relatorio.modo === "simulacao" ? "voltariam" : "voltaram"}: ${relatorio.modo === "simulacao" ? c.aDesfazer : c.desfeitos}; pulados: ${c.pulados}.`,
        "",
        "| Coleção | Quantidade |",
        "|---|---|",
        ...Object.entries(c.porColecao).map(([colecao, n]) => `| ${colecao} | ${n} |`),
        "",
        ...relatorio.pulados.map((item) => `- ${item.colecao}/${item.id}: ${item.motivo}`),
        "",
      ].join("\n");
      const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `publicar-migracao-desfazer-${execucao}`, relatorio, markdown);
      console.log(`\nRegistros da publicação: ${c.encontrados}`);
      console.log(`${args.modo === "simulacao" ? "Voltariam" : "Voltaram"}: ${args.modo === "simulacao" ? c.aDesfazer : c.desfeitos}`);
      for (const [colecao, n] of Object.entries(c.porColecao)) console.log(`  ${colecao}: ${n}`);
      console.log(`Pulados: ${c.pulados}`);
      console.log(`Relatório: ${caminhos.md}`);
      return;
    }

    const relatorio = await publicarMigracao({ db, tipos: tipos?.ok ? tipos.tipos : [], modo: args.modo, execucao, limite: args.limite });
    const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `publicar-migracao-${execucao}`, relatorio, relatorioDaPublicacaoEmMarkdown(relatorio, String(projectId)));
    console.log("");
    for (const item of relatorio.colecoes) {
      const c = item.contagens;
      console.log(`${item.colecao}: total ${c.total} (fora da migração ${c.foraDaMigracao}); importados ${c.importados}; a publicar ${c.aPublicar}; nesta execução ${c.nestaExecucao}; publicados ${c.publicados}; já no ar ${c.jaNoAr}; sem campo ${c.semCampoDeVisibilidade}; na lixeira ${c.naLixeira}`);
      const avisos = Object.entries(c.avisos);
      if (avisos.length) console.log(`  avisos: ${avisos.map(([aviso, n]) => `${aviso} ${n}`).join("; ")}`);
    }
    if (relatorio.colecoes.some((item) => (item.contagens.avisos.tituloAConfirmar ?? 0) > 0)) {
      console.log('\nAVISO: artigos com o título provisório "Título a confirmar (artigo n)" ficam visíveis no site.');
    }
    console.log(`Relatório: ${caminhos.md}`);
    if (args.modo === "executar") console.log(`Desfazer: npm run migracao:publicar -- --desfazer --execucao=${execucao}`);
  } finally {
    liberarTrava?.();
  }
}

principal().then(
  () => process.exit(0),
  (erro) => parar(`Falha na publicação: ${erro instanceof Error ? erro.message : String(erro)}`),
);
