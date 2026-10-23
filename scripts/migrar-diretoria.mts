// Migração da diretoria do site antigo (etapa 6, degrau 6): os 7 membros do
// mapa, com o modelo mínimo aprovado (cargo, nome, fotoMidiaId, periodo,
// ordem, profissionalId opcional, origem, datas) e revisarMigracao = true.
// profissionalId só quando o nome casa exatamente com um único profissional
// já cadastrado; senão, null. Sem tela no painel nem página no site.
//
// Uso:
//   npm run migracao:diretoria                                     simulação (padrão)
//   npm run migracao:diretoria -- --executar --confirmo-projeto=<id exibido> [--limite=N]
//   npm run migracao:diretoria -- --desfazer --execucao=<id>       simulação da reversão
//   npm run migracao:diretoria -- --desfazer --execucao=<id> --executar --confirmo-projeto=<id exibido>
//   (com --incluir-editadas, os alterados por pessoa também saem: rode antes a
//   simulação e confirme com --confirmo-apagar-editadas=<quantidade mostrada>)
//
// Por padrão SÓ SIMULA: lê os arquivos e as coleções midias, profissionais e
// diretoria, sem gravar no Firebase. Gravar exige --executar E
// --confirmo-projeto com o id do projeto exibido (da lista
// PROJETOS_PERMITIDOS) e a migração das imagens já executada (rode antes a
// dos profissionais, para a ligação pelo nome).
//
// Entradas (fora do Git, em docs/dados-privados/): mapa-site-antigo.jsonl
// (--mapa), imagens-origem.json e profissionais.json (só os nomes, para a
// simulação prever as ligações). Saída em tmp-migracao/ (fora do Git): o
// relatório, só com cargos, ids e contagens (sem nomes). Lê as credenciais
// do .env e do .env.local e nunca as exibe. Com FIRESTORE_EMULATOR_HOST
// definida, usa o emulador.
import { readFileSync } from "node:fs";
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { desfazerDiretoria, lerDiretoriaDoMapa, migrarDiretoria, relatorioDaDiretoriaEmMarkdown } from "../src/lib/migracao/diretoria.ts";
import { conferirProjeto, lerArgumentos, novoIdDeExecucao } from "../src/lib/migracao/execucao.ts";
import { validarImagensOrigem } from "../src/lib/migracao/imagensOrigem.ts";
import { PASTA_DA_SAIDA, adquirirTrava, gravarRelatorio } from "../src/lib/migracao/saida.ts";

const MAPA_PADRAO = "docs/dados-privados/mapa-site-antigo.jsonl";
const IMAGENS = "docs/dados-privados/imagens-origem.json";
const PROFISSIONAIS = "docs/dados-privados/profissionais.json";

// A trava é liberada antes de sair, inclusive quando o script para no meio.
let liberarTrava: (() => void) | null = null;

function parar(mensagem: string): never {
  console.error(mensagem);
  liberarTrava?.();
  process.exit(1);
}

function iniciar(projectId: string, emulador: boolean): App {
  if (emulador) return initializeApp({ projectId }, "migrar-diretoria");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) parar("Credenciais do Admin SDK ausentes no .env.local (FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "migrar-diretoria");
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

  const trava = adquirirTrava(PASTA_DA_SAIDA, "migrar-diretoria");
  if (!trava.ok) parar(`Outra execução está em andamento ou parou no meio (${trava.caminho}). Confira e apague a trava antes de repetir.`);
  liberarTrava = trava.liberar;
  try {
    const db = getFirestore(iniciar(projectId as string, emulador));

    if (args.desfazer) {
      const relatorio = await desfazerDiretoria({ db, execucaoAlvo: args.execucao as string, execucao, modo: args.modo, incluirEditados: args.incluirEditadas, confirmacaoDeEditados: args.confirmoApagarEditadas });
      const markdown = [
        `# Reversão da execução ${relatorio.execucaoDesfeita} (diretoria): ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
        "",
        `Projeto: ${projectId}. Encontrados: ${relatorio.contagens.encontrados}; ${relatorio.modo === "simulacao" ? "seriam desfeitos" : "desfeitos"}: ${relatorio.contagens.desfeitos}; pulados: ${relatorio.contagens.pulados}.`,
        `Alterados por uma pessoa que sairiam (só com --incluir-editadas): ${relatorio.contagens.editadosPorPessoaQueSairiam}.`,
        relatorio.bloqueado ? `**${relatorio.bloqueado}**` : "",
        "",
        ...relatorio.pulados.map((item) => `- diretoria/${item.id}: ${item.motivo}`),
        "",
      ].join("\n");
      const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `migrar-diretoria-desfazer-${execucao}`, relatorio, markdown);
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
    const mapa = lerDiretoriaDoMapa(conteudoDoMapa);
    if (!mapa.ok) parar(`Mapa recusado:\n${mapa.erros.map((erro) => `  ${erro}`).join("\n")}\nNada foi feito.`);
    const imagens = validarImagensOrigem(lerJson(IMAGENS));
    if (!imagens.ok) parar(`imagens-origem.json recusado (${imagens.erros.length} problema(s)). Nada foi feito.`);
    const arquivoDeProfissionais = lerJson(PROFISSIONAIS) as { profissionais?: { nome?: unknown }[] };
    const nomes = (arquivoDeProfissionais.profissionais ?? []).map((item) => (typeof item.nome === "string" ? item.nome : "")).filter(Boolean);

    const relatorio = await migrarDiretoria({ db, membros: mapa.membros, imagensDeOrigem: imagens.imagens, nomesDoArquivoDeProfissionais: nomes, modo: args.modo, execucao, limite: args.limite });
    if (!relatorio.ok) parar(relatorio.mensagem);
    const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `migrar-diretoria-${execucao}`, relatorio, relatorioDaDiretoriaEmMarkdown(relatorio, String(projectId)));

    const c = relatorio.contagens;
    console.log(`\nDiretoria: ${c.previstos} previstos; ${c.jaExistentes} já existentes; ${c.nestaExecucao} nesta execução; ${c.criados} criados`);
    console.log(`Fotos: ${c.fotos.noArquivo} no arquivo, ${c.fotos.ligaveisAgora} ligáveis agora`);
    console.log(`Profissional ligado agora: ${c.profissionalLigadoAgora}; casariam com o profissionais.json: ${c.casariamComOArquivoDeProfissionais}`);
    console.log(`Relatório: ${caminhos.md}`);
  } finally {
    liberarTrava?.();
  }
}

principal().then(
  () => process.exit(0),
  (erro) => parar(`Falha na migração: ${erro instanceof Error ? erro.message : String(erro)}`),
);
