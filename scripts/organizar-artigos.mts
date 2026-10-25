// Organização dos 4 artigos importados (25/10/2026): título e autores lidos
// nas imagens (docs/dados-privados/artigos-titulos.json, fora do Git;
// --entrada troca o caminho), categoria "Artigos científicos" e "A
// classificar" desativada. Ver src/lib/migracao/organizacaoArtigos.ts.
//
// Uso:
//   npm run migracao:organizar-artigos                                     simulação (padrão)
//   npm run migracao:organizar-artigos -- --executar --confirmo-projeto=<id exibido>
//   npm run migracao:organizar-artigos -- --desfazer --execucao=<id>       simulação da reversão
//   npm run migracao:organizar-artigos -- --desfazer --execucao=<id> --executar --confirmo-projeto=<id exibido>
//
// Por padrão SÓ SIMULA. Terminal e relatório em tmp-migracao/ só com
// contagens e ids (sem títulos nem autores). Lê as credenciais do .env e do
// .env.local e nunca as exibe. Com FIRESTORE_EMULATOR_HOST, usa o emulador.
import { readFileSync } from "node:fs";
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { conferirProjeto, lerArgumentos, novoIdDeExecucao } from "../src/lib/migracao/execucao.ts";
import { desfazerOrganizacao, lerTitulosDosArtigos, organizarArtigos } from "../src/lib/migracao/organizacaoArtigos.ts";
import { PASTA_DA_SAIDA, adquirirTrava, gravarRelatorio } from "../src/lib/migracao/saida.ts";

const ENTRADA_PADRAO = "docs/dados-privados/artigos-titulos.json";

let liberarTrava: (() => void) | null = null;

function parar(mensagem: string): never {
  console.error(mensagem);
  liberarTrava?.();
  process.exit(1);
}

function iniciar(projectId: string, emulador: boolean): App {
  if (emulador) return initializeApp({ projectId }, "organizar-artigos");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) parar("Credenciais do Admin SDK ausentes no .env.local (FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "organizar-artigos");
}

async function principal() {
  const lidos = lerArgumentos(process.argv.slice(2));
  if (!lidos.ok) parar(`${lidos.mensagem} Nada foi feito.`);
  const args = lidos.argumentos;
  if (args.tipo !== null || args.uid !== null || args.mapa !== null || args.limite !== null || args.incluirEditadas) parar("Este script não aceita --tipo, --uid, --mapa, --limite nem --incluir-editadas. Nada foi feito.");

  const emulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const projeto = conferirProjeto({ projectId, emulador, modo: args.modo, confirmoProjeto: args.confirmoProjeto });
  if (!projeto.ok) parar(projeto.mensagem);

  const execucao = novoIdDeExecucao(new Date());
  console.log(`Projeto: ${projectId}${emulador ? " (emulador)" : ""}`);
  console.log(`Modo: ${args.modo === "executar" ? "EXECUTAR (grava)" : "simulação (não grava nada no Firebase)"}${args.desfazer ? ", desfazer" : ""}`);
  console.log(`Execução: ${execucao}`);

  const trava = adquirirTrava(PASTA_DA_SAIDA, "organizar-artigos");
  if (!trava.ok) parar(`Outra execução está em andamento ou parou no meio (${trava.caminho}). Confira e apague a trava antes de repetir.`);
  liberarTrava = trava.liberar;
  try {
    const db = getFirestore(iniciar(projectId as string, emulador));

    if (args.desfazer) {
      const relatorio = await desfazerOrganizacao({ db, execucaoAlvo: args.execucao as string, execucao, modo: args.modo });
      const c = relatorio.contagens;
      const markdown = [`# Reversão da organização dos artigos ${relatorio.execucaoDesfeita}: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`, "", `Projeto: ${projectId}. Artigos que voltam: ${c.artigosQueVoltam}; categorias que voltam: ${c.categoriasQueVoltam}; categorias que saem: ${c.categoriasQueSaem}; pulados: ${c.pulados}.`, "", ...relatorio.pulados.map((item) => `- ${item.colecao}/${item.id}: ${item.motivo}`), ""].join("\n");
      const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `organizar-artigos-desfazer-${execucao}`, relatorio, markdown);
      console.log(`\nArtigos que voltam: ${c.artigosQueVoltam}; categorias que voltam: ${c.categoriasQueVoltam}; categorias que saem: ${c.categoriasQueSaem}; pulados: ${c.pulados}`);
      console.log(`Relatório: ${caminhos.md}`);
      return;
    }

    let conteudo: unknown;
    try {
      conteudo = JSON.parse(readFileSync(args.entrada ?? ENTRADA_PADRAO, "utf8"));
    } catch {
      parar(`Arquivo não encontrado ou não é JSON: ${args.entrada ?? ENTRADA_PADRAO}. Nada foi feito.`);
    }
    const textos = lerTitulosDosArtigos(conteudo);
    if (!textos.ok) parar(`Arquivo recusado (${textos.erros.length} problema(s)):\n${textos.erros.map((erro) => `  ${erro}`).join("\n")}\nNada foi feito.`);

    const resultado = await organizarArtigos({ db, textos: textos.artigos, modo: args.modo, execucao });
    if (!resultado.ok) parar(resultado.mensagem);
    const { relatorio } = resultado;
    const c = relatorio.contagens;
    const markdown = [
      `# Organização dos artigos importados: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
      "",
      `- Execução: ${execucao}`,
      `- Projeto: ${projectId}`,
      `- Desfazer: npm run migracao:organizar-artigos -- --desfazer --execucao=${execucao}`,
      "",
      `Artigos importados ${c.artigosImportados}; com título lido ${c.comTituloLido}; sem título legível ou já editados ${c.semTituloLegivelOuJaEditado}; com autores lidos ${c.comAutoresLidos}; mudam de categoria ${c.mudamDeCategoria}; alterados ${c.alterados}. "Artigos científicos": ${c.categoriaArtigosCientificos}. "A classificar" desativada: ${c.aClassificarDesativada ? "sim" : "não (já estava)"}.`,
      "",
      ...relatorio.artigos.map((artigo) => `- ${artigo.chave} (${artigo.id}): ${[...artigo.campos, ...(artigo.mudaCategoria ? ["categoria"] : [])].join(", ") || "nada a mudar"}`),
      "",
    ].join("\n");
    const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `organizar-artigos-${execucao}`, relatorio, markdown);
    console.log(`\nArtigos importados: ${c.artigosImportados}; com título lido: ${c.comTituloLido}; com autores lidos: ${c.comAutoresLidos}; mudam de categoria: ${c.mudamDeCategoria}; alterados: ${c.alterados}`);
    console.log(`"Artigos científicos": ${c.categoriaArtigosCientificos}; "A classificar" desativada: ${c.aClassificarDesativada ? "sim" : "não (já estava)"}`);
    console.log(`Relatório: ${caminhos.md}`);
    if (args.modo === "executar") console.log(`Desfazer: npm run migracao:organizar-artigos -- --desfazer --execucao=${execucao}`);
  } finally {
    liberarTrava?.();
  }
}

principal().then(
  () => process.exit(0),
  (erro) => parar(`Falha na organização: ${erro instanceof Error ? erro.message : String(erro)}`),
);
