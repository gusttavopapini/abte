// Migração dos profissionais do site antigo (etapa 6, degrau 2), todos com
// ativo = false (nenhum aparece no site antes da revisão).
//
// Uso:
//   npm run migracao:profissionais                                   simulação (padrão)
//   npm run migracao:profissionais -- --executar --confirmo-projeto=<id exibido> [--limite=N]
//   npm run migracao:profissionais -- --desfazer --execucao=<id>     simulação da reversão
//   npm run migracao:profissionais -- --desfazer --execucao=<id> --executar --confirmo-projeto=<id exibido> [--incluir-editadas]
//
// Por padrão SÓ SIMULA: valida o arquivo, converte os registros e lê as
// coleções midias e profissionais, sem gravar nada. Gravar exige --executar E
// --confirmo-projeto com o id do projeto exibido (da lista
// PROJETOS_PERMITIDOS) e a migração das imagens já executada (as fotos são
// ligadas pela origem).
//
// Entrada: docs/dados-privados/profissionais.json (fora do Git; --entrada
// troca o caminho). Relatório em tmp-migracao/ (fora do Git), sem nomes: cada
// registro aparece pela posição no arquivo. O terminal mostra só contagens.
// Lê as credenciais do .env e do .env.local (o .env.local prevalece) e nunca
// as exibe. Com FIRESTORE_EMULATOR_HOST definida, usa o emulador (testes).
import { readFileSync } from "node:fs";
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { conferirProjeto, lerArgumentos, novoIdDeExecucao } from "../src/lib/migracao/execucao.ts";
import {
  desfazerProfissionais,
  migrarProfissionais,
  relatorioDeProfissionaisEmMarkdown,
  validarProfissionaisOrigem,
} from "../src/lib/migracao/profissionais.ts";
import { PASTA_DA_SAIDA, adquirirTrava, gravarRelatorio } from "../src/lib/migracao/saida.ts";

const ENTRADA_PADRAO = "docs/dados-privados/profissionais.json";

// A trava é liberada antes de sair, inclusive quando o script para no meio.
let liberarTrava: (() => void) | null = null;

function parar(mensagem: string): never {
  console.error(mensagem);
  liberarTrava?.();
  process.exit(1);
}

function iniciar(projectId: string, emulador: boolean): App {
  if (emulador) return initializeApp({ projectId }, "migrar-profissionais");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) parar("Credenciais do Admin SDK ausentes no .env.local (FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "migrar-profissionais");
}

async function principal() {
  const lidos = lerArgumentos(process.argv.slice(2));
  if (!lidos.ok) parar(`${lidos.mensagem} Nada foi feito.`);
  const args = lidos.argumentos;
  if (args.tipo !== null || args.mapa !== null || args.uid !== null) parar("Este script não aceita --tipo, --mapa nem --uid. Nada foi feito.");

  const emulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const projeto = conferirProjeto({ projectId, emulador, modo: args.modo, confirmoProjeto: args.confirmoProjeto });
  if (!projeto.ok) parar(projeto.mensagem);

  const execucao = novoIdDeExecucao(new Date());
  console.log(`Projeto: ${projectId}${emulador ? " (emulador)" : ""}`);
  console.log(`Modo: ${args.modo === "executar" ? "EXECUTAR (grava)" : "simulação (não grava nada)"}${args.desfazer ? ", desfazer" : ""}`);
  console.log(`Execução: ${execucao}`);

  const trava = adquirirTrava(PASTA_DA_SAIDA, "migrar-profissionais");
  if (!trava.ok) parar(`Outra execução está em andamento ou parou no meio (${trava.caminho}). Confira e apague a trava antes de repetir.`);
  liberarTrava = trava.liberar;
  try {
    const db = getFirestore(iniciar(projectId as string, emulador));

    if (args.desfazer) {
      const relatorio = await desfazerProfissionais({ db, execucaoAlvo: args.execucao as string, execucao, modo: args.modo, incluirEditados: args.incluirEditadas });
      const markdown = [
        `# Reversão da execução ${relatorio.execucaoDesfeita} (profissionais): ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
        "",
        `Projeto: ${projectId}. Encontrados: ${relatorio.contagens.encontrados}; ${relatorio.modo === "simulacao" ? "seriam desfeitos" : "desfeitos"}: ${relatorio.contagens.desfeitos}; pulados: ${relatorio.contagens.pulados}.`,
        "",
        ...relatorio.pulados.map((item) => `- ${item.profissionalId}: ${item.motivo}`),
        "",
      ].join("\n");
      const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `migrar-profissionais-desfazer-${execucao}`, relatorio, markdown);
      console.log(`\nEncontrados: ${relatorio.contagens.encontrados}`);
      console.log(`${args.modo === "simulacao" ? "Seriam desfeitos" : "Desfeitos"}: ${relatorio.contagens.desfeitos}`);
      console.log(`Pulados: ${relatorio.contagens.pulados}`);
      console.log(`Relatório: ${caminhos.md}`);
      return;
    }

    let dados: unknown;
    try {
      dados = JSON.parse(readFileSync(args.entrada ?? ENTRADA_PADRAO, "utf8"));
    } catch {
      parar(`Arquivo não encontrado ou não é JSON: ${args.entrada ?? ENTRADA_PADRAO}. Nada foi feito.`);
    }
    const entrada = validarProfissionaisOrigem(dados);
    if (!entrada.ok) parar(`Entrada recusada (${entrada.erros.length} problema(s)):\n${entrada.erros.map((erro) => `  ${erro}`).join("\n")}\nNada foi feito.`);

    const relatorio = await migrarProfissionais({ db, registros: entrada.registros, modo: args.modo, execucao, limite: args.limite });
    if (!relatorio.ok) parar(relatorio.mensagem);
    const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `migrar-profissionais-${execucao}`, relatorio, relatorioDeProfissionaisEmMarkdown(relatorio, String(projectId)));

    const c = relatorio.contagens;
    console.log(`\nRegistros no arquivo: ${c.previstos}`);
    console.log(`Já existentes: ${c.jaExistentes}; candidatos: ${c.candidatos}; nesta execução: ${c.nestaExecucao}`);
    console.log(`Sem problema na conversão: ${c.semProblemaNaConversao}; iriam para revisão: ${c.iriamParaRevisao} (com as fotos ligadas: ${c.iriamParaRevisaoComAsFotosLigadas})`);
    console.log(`Fotos: ${c.fotos.seriamLigadasAgora} ligadas agora; ${c.fotos.pendentes} pendentes; ${c.fotos.semFotoNoArquivo} sem foto; ${c.fotos.fotoDupla} com foto dupla`);
    if (args.modo === "executar") console.log(`Criados: ${c.criados}; falhas: ${c.falhas}`);
    console.log(`Relatório: ${caminhos.md}`);
  } finally {
    liberarTrava?.();
  }
}

principal().then(
  () => process.exit(0),
  (erro) => parar(`Falha na migração: ${erro instanceof Error ? erro.message : String(erro)}`),
);
