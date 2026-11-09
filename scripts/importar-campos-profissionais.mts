// Importação dos campos extras dos profissionais (08/11/2026): endereço, site,
// outros perfis, e-mails extras, cidades e apresentação do site antigo
// (docs/dados-privados/profissionais.json; --entrada troca o caminho) e os
// mini currículos do lote 1 (docs/dados-privados/minicurriculos/, arquivos
// .txt, .docx ou .pdf com o nome do profissional), só onde a bio está vazia.
// Regras em src/lib/migracao/camposExtras.ts. Por padrão SÓ SIMULA. Gravar:
// -- --executar --confirmo-projeto=<id exibido>. Reverter:
// -- --desfazer --execucao=<id> (simula) e com --executar --confirmo-projeto.
// Lê as credenciais do .env e do .env.local (o .env.local prevalece) e nunca
// as exibe. Terminal e relatório só com contagens, posições e ids; os nomes
// de quem ficou sem mini currículo vão só para docs/dados-privados/.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { desfazerCamposExtras, importarCamposExtras, relatorioDosCamposExtrasEmMarkdown, type MiniCurriculo } from "../src/lib/migracao/camposExtras.ts";
import { conferirProjeto, lerArgumentos, novoIdDeExecucao } from "../src/lib/migracao/execucao.ts";
import { validarProfissionaisOrigem } from "../src/lib/migracao/profissionais.ts";
import { PASTA_DA_SAIDA, adquirirTrava, gravarRelatorio } from "../src/lib/migracao/saida.ts";

const ENTRADA_PADRAO = "docs/dados-privados/profissionais.json";
const PASTA_DOS_MINI_CURRICULOS = "docs/dados-privados/minicurriculos";
const LISTA_PRIVADA = "docs/dados-privados/sem-minicurriculo.md";
const NOME = "importar-campos-profissionais";

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

// Texto de um mini currículo, como está (a limpeza de espaços vem depois).
// .docx pelo XML do documento (parágrafos viram linhas); .pdf pelo pdftotext,
// se existir na máquina (sem ele, o arquivo é listado como não lido).
function lerMiniCurriculo(caminho: string): string | null {
  if (/\.txt$/i.test(caminho)) return readFileSync(caminho, "utf8");
  if (/\.docx$/i.test(caminho)) {
    const xml = execFileSync("unzip", ["-p", caminho, "word/document.xml"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
    return xml
      .replace(/<\/w:p>/g, "\n")
      .replace(/<w:tab\/>/g, " ")
      .replace(/<w:br\/>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  }
  if (/\.pdf$/i.test(caminho)) {
    try {
      return execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", caminho, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
    } catch {
      return null;
    }
  }
  return null;
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
      const r = await desfazerCamposExtras({ db, execucaoAlvo: args.execucao as string, execucao, modo: args.modo });
      const verbo = r.modo === "simulacao" ? "seriam desfeitos" : "desfeitos";
      const markdown = [`# Reversão da importação de campos extras ${r.execucaoDesfeita}: ${r.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`, "", `Encontrados: ${r.encontrados}; ${verbo}: ${r.desfeitos}; pulados: ${r.pulados.length}.`, "", ...r.pulados.map((p) => `- ${p.id}: ${p.motivo}`), ""].join("\n");
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

    const miniCurriculos: MiniCurriculo[] = [];
    const naoLidos: string[] = [];
    if (existsSync(PASTA_DOS_MINI_CURRICULOS)) {
      for (const arquivo of readdirSync(PASTA_DOS_MINI_CURRICULOS).filter((nome) => /\.(txt|docx|pdf)$/i.test(nome))) {
        const texto = lerMiniCurriculo(join(PASTA_DOS_MINI_CURRICULOS, arquivo));
        if (texto === null || !texto.trim()) naoLidos.push(arquivo);
        else miniCurriculos.push({ arquivo, texto });
      }
      console.log(`Mini currículos lidos: ${miniCurriculos.length}; não lidos: ${naoLidos.length}`);
    } else {
      console.log(`Pasta dos mini currículos não existe (${PASTA_DOS_MINI_CURRICULOS}): nenhum mini currículo lido.`);
    }

    const r = await importarCamposExtras({ db, registros: lida.registros, miniCurriculos, modo: args.modo, execucao });
    const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `${NOME}-${execucao}`, r, relatorioDosCamposExtrasEmMarkdown(r, String(projectId)));
    const c = r.contagens;
    console.log(`\nDocumentos a alterar: ${c.documentos}; sem documento: ${c.semDocumento}; na lixeira: ${c.naLixeira}`);
    console.log(`A gravar por campo: ${JSON.stringify(c.porCampo)}`);
    console.log(`Já preenchidos (pulados): ${JSON.stringify(c.jaPreenchidos)}`);
    console.log(`Editados no painel (pulados): ${JSON.stringify(c.editadosNoPainel)}`);
    console.log(`Fora da validação ou do limite: ${JSON.stringify(c.descartados)}`);
    console.log(`Lote 1 sem mini currículo: ${r.semMiniCurriculo.length}; mini currículos sem profissional: ${r.miniCurriculosSemProfissional.length}`);
    if (args.modo === "executar") console.log(`Gravados: ${c.gravados}; pulados na gravação: ${c.pulados}`);

    // Nomes de quem ficou sem mini currículo: só na pasta privada.
    if (r.semMiniCurriculo.length > 0 || r.miniCurriculosSemProfissional.length > 0 || naoLidos.length > 0) {
      const nomes = new Map((await db.collection("profissionais").get()).docs.map((d) => [d.id, String(d.get("nome") ?? "")]));
      writeFileSync(
        LISTA_PRIVADA,
        [
          `# Mini currículos do lote 1 (${execucao})`,
          "",
          "## Profissionais do lote 1 sem mini currículo",
          ...r.semMiniCurriculo.map((id) => `- ${nomes.get(id) ?? id} (${id})`),
          "",
          "## Arquivos sem profissional conferido pelo nome",
          ...(r.miniCurriculosSemProfissional.length ? r.miniCurriculosSemProfissional.map((arquivo) => `- ${arquivo}`) : ["- nenhum"]),
          "",
          "## Arquivos não lidos",
          ...(naoLidos.length ? naoLidos.map((arquivo) => `- ${arquivo}`) : ["- nenhum"]),
          "",
        ].join("\n"),
      );
      console.log(`Lista privada: ${LISTA_PRIVADA}`);
    }
    console.log(`Relatório: ${caminhos.md}`);
    if (args.modo === "executar" && c.gravados > 0) console.log(`Para desfazer: npm run migracao:campos-profissionais -- --desfazer --execucao=${execucao}`);
  } finally {
    liberarTrava?.();
  }
}

principal().then(
  () => process.exit(0),
  (erro) => parar(`Falha na importação de campos extras: ${erro instanceof Error ? erro.message : String(erro)}`),
);
