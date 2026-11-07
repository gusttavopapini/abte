// Importação dos telefones dos profissionais (06/11/2026): telefones do site
// antigo (docs/dados-privados/profissionais.json; --entrada troca o caminho)
// e número fixo que estava no campo WhatsApp. Regras em
// src/lib/migracao/telefones.ts. Por padrão SÓ SIMULA. Gravar:
// -- --executar --confirmo-projeto=<id exibido>. Reverter:
// -- --desfazer --execucao=<id> (simula) e com --executar --confirmo-projeto.
// Lê as credenciais do .env e do .env.local (o .env.local prevalece) e nunca
// as exibe. Terminal e relatório só com contagens, posições e ids.
import { readFileSync } from "node:fs";
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { conferirProjeto, lerArgumentos, novoIdDeExecucao } from "../src/lib/migracao/execucao.ts";
import { validarProfissionaisOrigem } from "../src/lib/migracao/profissionais.ts";
import { PASTA_DA_SAIDA, adquirirTrava, gravarRelatorio } from "../src/lib/migracao/saida.ts";
import { desfazerTelefones, importarTelefones, relatorioDosTelefonesEmMarkdown } from "../src/lib/migracao/telefones.ts";

const ENTRADA_PADRAO = "docs/dados-privados/profissionais.json";
const NOME = "importar-telefones";

let liberarTrava: (() => void) | null = null;

function parar(mensagem: string): never {
  console.error(mensagem);
  liberarTrava?.();
  process.exit(1);
}

function iniciar(projectId: string, emulador: boolean): App {
  if (emulador) return initializeApp({ projectId }, NOME);
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) parar("Credenciais do Admin SDK ausentes no .env.local (FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, NOME);
}

async function principal() {
  const lidos = lerArgumentos(process.argv.slice(2));
  if (!lidos.ok) parar(`${lidos.mensagem} Nada foi feito.`);
  const args = lidos.argumentos;
  if (args.tipo !== null || args.mapa !== null || args.uid !== null || args.limite !== null || args.incluirEditadas) {
    parar("Este script não aceita --tipo, --mapa, --uid, --limite nem --incluir-editadas. Nada foi feito.");
  }
  const emulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const projeto = conferirProjeto({ projectId, emulador, modo: args.modo, confirmoProjeto: args.confirmoProjeto });
  if (!projeto.ok) parar(projeto.mensagem);

  const execucao = novoIdDeExecucao(new Date());
  console.log(`Projeto: ${projectId}${emulador ? " (emulador)" : ""}`);
  console.log(`Modo: ${args.modo === "executar" ? "EXECUTAR (grava)" : "simulação (não grava nada)"}${args.desfazer ? ", desfazer" : ""}`);
  console.log(`Execução: ${execucao}`);

  const trava = adquirirTrava(PASTA_DA_SAIDA, NOME);
  if (!trava.ok) parar(`Outra execução está em andamento ou parou no meio (${trava.caminho}). Confira e apague a trava antes de repetir.`);
  liberarTrava = trava.liberar;
  try {
    const db = getFirestore(iniciar(projectId as string, emulador));
    if (args.desfazer) {
      const r = await desfazerTelefones({ db, execucaoAlvo: args.execucao as string, execucao, modo: args.modo });
      const verbo = r.modo === "simulacao" ? "seriam desfeitos" : "desfeitos";
      const markdown = [`# Reversão da importação de telefones ${r.execucaoDesfeita}: ${r.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`, "", `Encontrados: ${r.encontrados}; ${verbo}: ${r.desfeitos}; pulados: ${r.pulados.length}.`, "", ...r.pulados.map((p) => `- ${p.id}: ${p.motivo}`), ""].join("\n");
      const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `${NOME}-desfazer-${execucao}`, r, markdown);
      console.log(`Encontrados: ${r.encontrados}; ${verbo}: ${r.desfeitos}; pulados: ${r.pulados.length}`);
      console.log(`Relatório: ${caminhos.md}`);
      return;
    }
    const caminhoDaEntrada = args.entrada ?? ENTRADA_PADRAO;
    let dados: unknown;
    try {
      dados = JSON.parse(readFileSync(caminhoDaEntrada, "utf8"));
    } catch {
      parar(`Arquivo não encontrado ou não é JSON: ${caminhoDaEntrada}. Nada foi feito.`);
    }
    const lida = validarProfissionaisOrigem(dados);
    if (!lida.ok) parar(`Entrada recusada (${lida.erros.length} problema(s)). Nada foi feito.`);
    const r = await importarTelefones({ db, registros: lida.registros, modo: args.modo, execucao });
    const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `${NOME}-${execucao}`, r, relatorioDosTelefonesEmMarkdown(r, String(projectId)));
    const c = r.contagens;
    const lista = (filtro: (item: (typeof r.plano)[number]) => boolean) => r.plano.filter(filtro).map((item) => (item.posicao ? `posição ${item.posicao}` : `documento ${item.documentoId}`)).join(", ") || "nenhum";
    console.log(`\nSite antigo, a gravar: ${lista((i) => i.regra === "siteAntigo" && i.situacao === "aGravar")}`);
    console.log(`Fixo no WhatsApp, a mover: ${lista((i) => i.regra === "fixoNoWhatsapp" && i.situacao === "aGravar")}`);
    console.log(`A gravar: ${c.aGravar}; já com telefone: ${c.jaTemTelefone}; sem número válido: ${c.semNumeroValido}; sem documento: ${c.semDocumento}; na lixeira: ${c.naLixeira}`);
    console.log(`Números do site antigo deixados de fora: ${r.plano.reduce((soma, item) => soma + item.deFora, 0)}`);
    if (args.modo === "executar") console.log(`Gravados: ${c.gravados}; pulados na gravação: ${c.pulados}`);
    console.log(`Relatório: ${caminhos.md}`);
    if (args.modo === "executar" && c.gravados > 0) console.log(`Para desfazer: npm run migracao:telefones -- --desfazer --execucao=${execucao}`);
  } finally {
    liberarTrava?.();
  }
}

principal().then(
  () => process.exit(0),
  (erro) => parar(`Falha na importação de telefones: ${erro instanceof Error ? erro.message : String(erro)}`),
);
