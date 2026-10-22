// Marca a conferência de fotos de menores nas imagens importadas do site
// antigo (etapa 6), enquanto o painel não tem tela para isso.
//
// Uso:
//   npm run migracao:conferencia-menor                              simulação (padrão)
//   npm run migracao:conferencia-menor -- --uid=<uid de quem conferiu>   simulação, conferindo a pessoa
//   npm run migracao:conferencia-menor -- --executar --confirmo-projeto=<id exibido> --uid=<uid>
//
// Entrada: docs/dados-privados/conferencia-menores.json (fora do Git; --entrada
// troca o caminho), no formato { "conferido": [ids de midias], "naoSeAplica": [ids] }.
// Por padrão SÓ SIMULA. Gravar exige --executar, --confirmo-projeto com o id
// do projeto exibido (da lista PROJETOS_PERMITIDOS) e --uid de uma pessoa com
// papel no painel, que assina o registro de alterações. Atualiza só
// conferenciaDeMenor, só em documentos que já têm o campo (imagens
// importadas), uma linha "editar" por documento. Relatório em tmp-migracao/,
// só com ids. Lê as credenciais do .env e do .env.local (o .env.local
// prevalece) e nunca as exibe. Com FIRESTORE_EMULATOR_HOST e
// FIREBASE_AUTH_EMULATOR_HOST definidas, usa os emuladores (testes).
import { readFileSync } from "node:fs";
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { autorDaConferencia, marcarConferencia, validarListaDeConferencia } from "../src/lib/migracao/conferenciaDeMenor.ts";
import { conferirProjeto, lerArgumentos, novoIdDeExecucao } from "../src/lib/migracao/execucao.ts";
import { PASTA_DA_SAIDA, adquirirTrava, gravarRelatorio } from "../src/lib/migracao/saida.ts";

const ENTRADA_PADRAO = "docs/dados-privados/conferencia-menores.json";

// A trava é liberada antes de sair, inclusive quando o script para no meio.
let liberarTrava: (() => void) | null = null;

function parar(mensagem: string): never {
  console.error(mensagem);
  liberarTrava?.();
  process.exit(1);
}

function iniciar(projectId: string, emulador: boolean): App {
  if (emulador) return initializeApp({ projectId }, "marcar-conferencia-menor");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) parar("Credenciais do Admin SDK ausentes no .env.local (FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "marcar-conferencia-menor");
}

async function principal() {
  const lidos = lerArgumentos(process.argv.slice(2));
  if (!lidos.ok) parar(`${lidos.mensagem} Nada foi feito.`);
  const args = lidos.argumentos;
  if (args.desfazer || args.limite !== null || args.tipo !== null || args.mapa !== null || args.incluirEditadas) {
    parar("Este script aceita só --executar, --confirmo-projeto, --uid e --entrada. Nada foi feito.");
  }

  const emFirestore = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const emAuth = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  if (emFirestore !== emAuth) parar("Defina as duas variáveis de emulador (Firestore e Authentication) ou nenhuma. Nada foi feito.");
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const projeto = conferirProjeto({ projectId, emulador: emFirestore, modo: args.modo, confirmoProjeto: args.confirmoProjeto });
  if (!projeto.ok) parar(projeto.mensagem);
  if (args.modo === "executar" && !args.uid) parar("Para gravar, informe --uid=<uid de quem conferiu>. Nada foi gravado.");

  const execucao = novoIdDeExecucao(new Date());
  console.log(`Projeto: ${projectId}${emFirestore ? " (emuladores)" : ""}`);
  console.log(`Modo: ${args.modo === "executar" ? "EXECUTAR (grava)" : "simulação (não grava nada)"}`);
  console.log(`Execução: ${execucao}`);

  let conteudo: string;
  try {
    conteudo = readFileSync(args.entrada ?? ENTRADA_PADRAO, "utf8");
  } catch {
    parar(`Arquivo não encontrado: ${args.entrada ?? ENTRADA_PADRAO}. Nada foi feito.`);
  }
  let dados: unknown;
  try {
    dados = JSON.parse(conteudo);
  } catch {
    parar("A lista não é JSON. Nada foi feito.");
  }
  const lista = validarListaDeConferencia(dados);
  if (!lista.ok) parar(`Lista recusada:\n${lista.erros.map((erro) => `  ${erro}`).join("\n")}\nNada foi feito.`);

  const trava = adquirirTrava(PASTA_DA_SAIDA, "marcar-conferencia-menor");
  if (!trava.ok) parar(`Outra execução está em andamento ou parou no meio (${trava.caminho}). Confira e apague a trava antes de repetir.`);
  liberarTrava = trava.liberar;
  try {
    const app = iniciar(projectId as string, emFirestore);
    let autor = null;
    if (args.uid) {
      const conferido = await autorDaConferencia(getAuth(app), args.uid);
      if (!conferido.ok) parar(`${conferido.mensagem} Nada foi gravado.`);
      autor = conferido.autor;
      console.log(`Quem conferiu: usuário com papel ${autor.papel}`);
    }
    const relatorio = await marcarConferencia({ db: getFirestore(app), itens: lista.itens, autor, modo: args.modo, execucao });
    const markdown = [
      `# Conferência de menores: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
      "",
      `Execução ${execucao}. Projeto: ${projectId}. Na lista: ${relatorio.contagens.naLista}; ${relatorio.modo === "simulacao" ? "seriam marcadas" : "marcadas"}: ${relatorio.contagens.marcadas}; puladas: ${relatorio.contagens.puladas}.`,
      "",
      ...relatorio.marcadas.map((item) => `- ${item.midiaId}: ${item.de} para ${item.para}`),
      ...relatorio.puladas.map((item) => `- ${item.midiaId}: pulada, ${item.motivo}`),
      "",
    ].join("\n");
    const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `marcar-conferencia-menor-${execucao}`, relatorio, markdown);
    console.log(`\nNa lista: ${relatorio.contagens.naLista}`);
    console.log(`${args.modo === "simulacao" ? "Seriam marcadas" : "Marcadas"}: ${relatorio.contagens.marcadas}`);
    console.log(`Puladas: ${relatorio.contagens.puladas}`);
    console.log(`Relatório: ${caminhos.md}`);
  } finally {
    liberarTrava?.();
  }
}

principal().then(
  () => process.exit(0),
  (erro) => parar(`Falha na marcação: ${erro instanceof Error ? erro.message : String(erro)}`),
);
