// Cadastro de profissionais em lote (04/11/2026): profissionais ATIVOS, com a
// mesma validação e a mesma gravação do painel e a foto (quando houver) pelo
// processamento da biblioteca de mídia. Ver src/lib/migracao/profissionaisLote.ts.
//
// Uso:
//   npm run cadastro:profissionais-lote                                   simulação (padrão)
//   npm run cadastro:profissionais-lote -- --executar --confirmo-projeto=<id exibido>
//   npm run cadastro:profissionais-lote -- --desfazer --execucao=<id>     simulação da reversão
//   npm run cadastro:profissionais-lote -- --desfazer --execucao=<id> --executar --confirmo-projeto=<id exibido>
//   --entrada=<arquivo> troca o arquivo de entrada (padrão: docs/dados-privados/lote-1.json).
//
// Repetir com a mesma entrada não duplica nada: só cadastra o que falta e
// envia e liga as fotos que chegaram depois (arquivo na pasta das fotos).
//
// Por padrão SÓ SIMULA: lê o arquivo, as fotos e as coleções profissionais e
// midias, sem gravar. Gravar exige --executar E --confirmo-projeto com o id
// do projeto exibido (da lista PROJETOS_PERMITIDOS). Relatório em
// tmp-migracao/ (fora do Git), pela posição no arquivo; o terminal mostra só
// contagens e posições. Lê as credenciais do .env e do .env.local (o
// .env.local prevalece) e nunca as exibe. Com FIRESTORE_EMULATOR_HOST e
// FIREBASE_STORAGE_EMULATOR_HOST definidas, usa os emuladores (testes).
import { readFileSync } from "node:fs";
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { conferirProjeto, lerArgumentos, novoIdDeExecucao } from "../src/lib/migracao/execucao.ts";
import { cadastrarLote, desfazerLote, relatorioDoLoteEmMarkdown, validarEntradaDoLote } from "../src/lib/migracao/profissionaisLote.ts";
import { PASTA_DA_SAIDA, adquirirTrava, gravarRelatorio } from "../src/lib/migracao/saida.ts";

const ENTRADA_PADRAO = "docs/dados-privados/lote-1.json";
const NOME = "cadastrar-profissionais-lote";

// A trava é liberada antes de sair, inclusive quando o script para no meio.
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
  console.log(`Modo: ${args.modo === "executar" ? "EXECUTAR (grava)" : "simulação (não grava nada)"}${args.desfazer ? ", desfazer" : ""}`);
  console.log(`Execução: ${execucao}`);

  const trava = adquirirTrava(PASTA_DA_SAIDA, NOME);
  if (!trava.ok) parar(`Outra execução está em andamento ou parou no meio (${trava.caminho}). Confira e apague a trava antes de repetir.`);
  liberarTrava = trava.liberar;
  try {
    const app = iniciar(projectId as string, emFirestore);
    const servicos = { db: getFirestore(app), bucket: getStorage(app).bucket(nomeDoBucket) };

    if (args.desfazer) {
      const relatorio = await desfazerLote({ servicos, execucaoAlvo: args.execucao as string, execucao, modo: args.modo });
      const c = relatorio.contagens;
      const verbo = relatorio.modo === "simulacao" ? "seriam desfeitos" : "desfeitos";
      const markdown = [
        `# Reversão da execução ${relatorio.execucaoDesfeita} (cadastro em lote): ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
        "",
        `Projeto: ${projectId}. Profissionais encontrados: ${c.profissionaisEncontrados}; ${verbo}: ${c.profissionaisDesfeitos}.`,
        `Fotos encontradas: ${c.fotosEncontradas}; ${verbo}: ${c.fotosDesfeitas} (desligadas de profissionais que ficam: ${c.fotosDesligadas}). Pulados: ${c.pulados}.`,
        "",
        ...relatorio.pulados.map((item) => `- ${item.colecao}/${item.id}: ${item.motivo}`),
        "",
      ].join("\n");
      const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `${NOME}-desfazer-${execucao}`, relatorio, markdown);
      console.log(`\nProfissionais: ${c.profissionaisEncontrados} encontrados, ${c.profissionaisDesfeitos} ${verbo}`);
      console.log(`Fotos: ${c.fotosEncontradas} encontradas, ${c.fotosDesfeitas} ${verbo}, ${c.fotosDesligadas} desligadas`);
      console.log(`Pulados: ${c.pulados}`);
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
    const lida = validarEntradaDoLote(dados);
    if (!lida.ok) parar(`Entrada recusada (${lida.erros.length} problema(s)):\n${lida.erros.map((erro) => `  ${erro}`).join("\n")}\nNada foi feito.`);

    const relatorio = await cadastrarLote({ servicos, entrada: lida.entrada, modo: args.modo, execucao });
    const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `${NOME}-${execucao}`, relatorio, relatorioDoLoteEmMarkdown(relatorio, String(projectId)));

    const c = relatorio.contagens;
    const posicoes = (filtro: (item: (typeof relatorio.registros)[number]) => boolean) => relatorio.registros.filter(filtro).map((item) => item.posicao).join(", ") || "nenhuma";
    console.log(`\nRegistros no arquivo: ${c.noArquivo}`);
    console.log(`Já existentes: ${c.jaExistentes}; a criar: ${c.aCriar} (posições ${posicoes((item) => item.situacao === "aCriar")}); recusados: ${c.recusados} (posições ${posicoes((item) => item.situacao === "recusado")})`);
    for (const item of relatorio.registros.filter((registro) => registro.situacao === "recusado")) {
      console.log(`  Posição ${item.posicao}: recusado nos campos ${Object.keys(item.recusas).join(", ")}`);
    }
    console.log(`Possíveis duplicados: ${c.possiveisDuplicados} (posições ${posicoes((item) => item.possiveisDuplicados.length > 0)})`);
    console.log(`Fotos: ${c.fotos.aEnviarOuLigar} a enviar ou ligar; ${c.fotos.jaLigadas} já ligadas; ${c.fotos.semArquivo} sem arquivo (posições ${posicoes((item) => item.foto === "semArquivo")}); ${c.fotos.recusadas} recusadas (posições ${posicoes((item) => item.foto === "recusada" || item.foto === "varios")}); ${c.fotos.naLixeira} na lixeira`);
    console.log(`Fotos de baixa resolução: ${c.fotos.baixaResolucao} (posições ${posicoes((item) => Boolean(item.fotoMedidas?.baixaResolucao))}); reduzidas como no navegador: ${c.fotos.reduzidas} (posições ${posicoes((item) => Boolean(item.fotoMedidas?.reduzidaComoNoNavegador))})`);
    if (args.modo === "executar") console.log(`Criados: ${c.criados}; fotos ligadas: ${c.fotosLigadas}; falhas: ${c.falhas}`);
    console.log(`Relatório: ${caminhos.md}`);
    if (args.modo === "executar" && c.criados + c.fotosLigadas > 0) console.log(`Para desfazer: npm run cadastro:profissionais-lote -- --desfazer --execucao=${execucao}`);
  } finally {
    liberarTrava?.();
  }
}

principal().then(
  () => process.exit(0),
  (erro) => parar(`Falha no cadastro em lote: ${erro instanceof Error ? erro.message : String(erro)}`),
);
