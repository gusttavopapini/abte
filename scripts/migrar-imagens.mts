// Migração das imagens do site antigo para a biblioteca de mídia (etapa 6,
// degrau 1: só imagens; o vínculo com os registros vem nas etapas seguintes).
//
// Uso:
//   npm run migracao:imagens                                   simulação (padrão)
//   npm run migracao:imagens -- --tipo=produto --limite=5      simulação filtrada
//   npm run migracao:imagens -- --executar --confirmo-projeto=<id exibido> [--limite=N] [--tipo=T]
//   npm run migracao:imagens -- --desfazer --execucao=<id>     simulação da reversão
//   npm run migracao:imagens -- --desfazer --execucao=<id> --executar --confirmo-projeto=<id exibido> [--incluir-editadas]
//
// Por padrão SÓ SIMULA: valida a entrada e lê a coleção midias (para achar o
// que já foi importado), sem baixar nem gravar nada. Gravar exige --executar
// E --confirmo-projeto com o id do projeto exibido, que precisa estar em
// PROJETOS_PERMITIDOS (src/lib/migracao/execucao.ts).
//
// Entrada: docs/dados-privados/imagens-origem.json e mapa-site-antigo.jsonl
// (fora do Git; --entrada e --mapa trocam os caminhos). Relatório em
// tmp-migracao/ (fora do Git), só com ids e contagens. O terminal mostra só
// contagens. Lê as credenciais do .env e do .env.local (o .env.local
// prevalece) e nunca as exibe. Com FIRESTORE_EMULATOR_HOST e
// FIREBASE_STORAGE_EMULATOR_HOST definidas, usa os emuladores (testes).
import { readFileSync } from "node:fs";
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { conferirProjeto, lerArgumentos, novoIdDeExecucao } from "../src/lib/migracao/execucao.ts";
import {
  ORIGEM_DAS_MIDIAS_DO_WIX,
  desfazerExecucao,
  migrarImagens,
  relatorioEmMarkdown,
  relatorioSemEnderecoDoWix,
} from "../src/lib/migracao/imagens.ts";
import { lerMapaParaAlt, validarImagensOrigem, TIPOS_DE_USO } from "../src/lib/migracao/imagensOrigem.ts";
import { criarClienteDeRede } from "../src/lib/migracao/rede.ts";
import { PASTA_DA_SAIDA, adquirirTrava, gravarRelatorio } from "../src/lib/migracao/saida.ts";

const ENTRADA_PADRAO = "docs/dados-privados/imagens-origem.json";
const MAPA_PADRAO = "docs/dados-privados/mapa-site-antigo.jsonl";

// A trava é liberada antes de sair, inclusive quando o script para no meio.
let liberarTrava: (() => void) | null = null;

function parar(mensagem: string): never {
  console.error(mensagem);
  liberarTrava?.();
  process.exit(1);
}

function iniciar(projectId: string, emulador: boolean): App {
  if (emulador) return initializeApp({ projectId }, "migrar-imagens");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) parar("Credenciais do Admin SDK ausentes no .env.local (FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "migrar-imagens");
}

function lerArquivo(caminho: string): string {
  try {
    return readFileSync(caminho, "utf8");
  } catch {
    parar(`Arquivo não encontrado: ${caminho}. Nada foi feito.`);
  }
}

async function principal() {
  const lidos = lerArgumentos(process.argv.slice(2));
  if (!lidos.ok) parar(`${lidos.mensagem} Nada foi feito.`);
  const args = lidos.argumentos;
  if (args.tipo !== null && !(TIPOS_DE_USO as readonly string[]).includes(args.tipo)) parar(`--tipo desconhecido. Use um de: ${TIPOS_DE_USO.join(", ")}.`);

  const emFirestore = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const emStorage = Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST);
  if (emFirestore !== emStorage) parar("Defina as duas variáveis de emulador (Firestore e Storage) ou nenhuma. Nada foi feito.");
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const nomeDoBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const projeto = conferirProjeto({ projectId, emulador: emFirestore, modo: args.modo, confirmoProjeto: args.confirmoProjeto });
  if (!projeto.ok) parar(projeto.mensagem);
  if (!nomeDoBucket) parar("Preencha NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET no .env.local. Nada foi feito.");

  const execucao = novoIdDeExecucao(new Date());
  console.log(`Projeto: ${projectId}${emFirestore ? " (emuladores)" : ""}`);
  console.log(`Bucket: ${nomeDoBucket}`);
  console.log(`Modo: ${args.modo === "executar" ? "EXECUTAR (grava)" : "simulação (não baixa nem grava nada)"}${args.desfazer ? ", desfazer" : ""}`);
  console.log(`Execução: ${execucao}`);

  const trava = adquirirTrava(PASTA_DA_SAIDA, "migrar-imagens");
  if (!trava.ok) parar(`Outra execução está em andamento ou parou no meio (${trava.caminho}). Confira e apague a trava antes de repetir.`);
  liberarTrava = trava.liberar;
  try {
    const app = iniciar(projectId as string, emFirestore);
    const servicos = { db: getFirestore(app), bucket: getStorage(app).bucket(nomeDoBucket) };

    if (args.desfazer) {
      const relatorio = await desfazerExecucao({
        servicos,
        execucaoAlvo: args.execucao as string,
        execucao,
        modo: args.modo,
        incluirEditadas: args.incluirEditadas,
      });
      const markdown = [
        `# Reversão da execução ${relatorio.execucaoDesfeita}: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
        "",
        `Projeto: ${projectId}. Encontradas: ${relatorio.contagens.encontradas}; ${relatorio.modo === "simulacao" ? "seriam desfeitas" : "desfeitas"}: ${relatorio.contagens.desfeitas}; puladas: ${relatorio.contagens.puladas}.`,
        "",
        ...relatorio.puladas.map((item) => `- ${item.midiaId}: ${item.motivo}`),
        "",
      ].join("\n");
      const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `migrar-imagens-desfazer-${execucao}`, relatorio, markdown);
      console.log(`\nEncontradas: ${relatorio.contagens.encontradas}`);
      console.log(`${args.modo === "simulacao" ? "Seriam desfeitas" : "Desfeitas"}: ${relatorio.contagens.desfeitas}`);
      console.log(`Puladas: ${relatorio.contagens.puladas}`);
      console.log(`Relatório: ${caminhos.md}`);
      return;
    }

    const entrada = validarImagensOrigem(JSON.parse(lerArquivo(args.entrada ?? ENTRADA_PADRAO)));
    if (!entrada.ok) parar(`Entrada recusada (${entrada.erros.length} problema(s)):\n${entrada.erros.map((erro) => `  ${erro}`).join("\n")}\nNada foi feito.`);
    const mapa = lerMapaParaAlt(lerArquivo(args.mapa ?? MAPA_PADRAO));
    if (!mapa.ok) parar(`Mapa recusado:\n${mapa.erros.map((erro) => `  ${erro}`).join("\n")}\nNada foi feito.`);

    // Host fixo: só static.wixstatic.com, nunca um endereço vindo dos arquivos.
    const rede = criarClienteDeRede({ origem: ORIGEM_DAS_MIDIAS_DO_WIX });
    const relatorio = await migrarImagens({
      servicos,
      imagens: entrada.imagens,
      mapa: mapa.mapa,
      modo: args.modo,
      execucao,
      limite: args.limite,
      tipo: args.tipo,
      baixar: (caminho) => rede.baixar(caminho),
      aoProgredir: (feitas, total) => {
        if (feitas % 10 === 0 || feitas === total) console.log(`  ${feitas} de ${total}`);
      },
    });
    if (!relatorioSemEnderecoDoWix(relatorio)) parar("O relatório contém endereço do Wix: não foi gravado. Confira o código.");
    const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `migrar-imagens-${execucao}`, relatorio, relatorioEmMarkdown(relatorio, String(projectId)));

    const c = relatorio.contagens;
    console.log(`\nImagens no arquivo: ${c.encontradas} (usos: ${c.usos})`);
    console.log(`Previstas aceitas: ${c.previstasAceitas}; previstas recusadas: ${c.previstasRecusadas}`);
    console.log(`Já existentes: ${c.jaExistentes}; candidatas: ${c.candidatas}; nesta execução: ${c.nestaExecucao}`);
    if (c.jaExistentesNaLixeira > 0) console.log(`AVISO: ${c.jaExistentesNaLixeira} já importada(s) estão na lixeira e não serão importadas de novo (lista no relatório).`);
    if (args.modo === "executar") {
      console.log(`Baixadas: ${c.baixadas}; migradas: ${c.migradas}; reduzidas: ${c.reduzidas}; recusadas pelo tipo: ${c.recusadasPeloTipo}; falhas: ${c.falhas}`);
      console.log(`Pedidos ao servidor: ${rede.pedidos}`);
      console.log(`Verificação: ${relatorio.verificacao?.problemas.length ?? 0} problema(s)`);
    }
    console.log(`Relatório: ${caminhos.md}`);
    if (relatorio.interrompido) parar(`\nINTERROMPIDA: ${relatorio.interrompido}`);
    if (relatorio.verificacao && relatorio.verificacao.problemas.length > 0) parar("\nA verificação automática achou problemas (ver o relatório).");
  } finally {
    liberarTrava?.();
  }
}

principal().then(
  () => process.exit(0),
  (erro) => parar(`Falha na migração: ${erro instanceof Error ? erro.message : String(erro)}`),
);
