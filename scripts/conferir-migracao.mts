// Conferência depois de cada passo da migração (roteiro de execução real).
// SÓ LÊ: mostra o projeto, a contagem de documentos de cada coleção (todos,
// da migração e para revisão) e quantos documentos têm endereço do Wix (os
// ids, para achar). Nunca grava. Lê as credenciais do .env e do .env.local
// e nunca as exibe. Com FIRESTORE_EMULATOR_HOST definida, usa o emulador.
//
// Uso:
//   npm run migracao:conferir
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { conferirMigracao } from "../src/lib/migracao/conferencia.ts";

function parar(mensagem: string): never {
  console.error(mensagem);
  process.exit(1);
}

function iniciar(projectId: string, emulador: boolean): App {
  if (emulador) return initializeApp({ projectId }, "conferir-migracao");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) parar("Credenciais do Admin SDK ausentes no .env.local (FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "conferir-migracao");
}

async function principal() {
  if (process.argv.length > 2) parar("Este script não aceita argumentos (só lê).");
  const emulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (!projectId) parar("FIREBASE_ADMIN_PROJECT_ID ausente.");
  console.log(`Projeto: ${projectId}${emulador ? " (emulador)" : ""}`);
  console.log("Modo: só leitura (não grava nada)\n");
  const resultado = await conferirMigracao(getFirestore(iniciar(projectId, emulador)));
  console.log("| Coleção | Total | Da migração | Para revisão | Com endereço do Wix |");
  console.log("|---|---|---|---|---|");
  for (const item of resultado.colecoes) console.log(`| ${item.colecao} | ${item.total} | ${item.daMigracao} | ${item.paraRevisar} | ${item.comEnderecoDoWix.length}${item.comEnderecoDoWix.length ? ` (${item.comEnderecoDoWix.join(", ")})` : ""} |`);
  console.log(`\nImagens do texto dos posts ainda pendentes (midia:wix:..., não aparecem no site): ${resultado.imagensPendentesNoTexto} em ${resultado.postsComImagemPendente} post(s)`);
  console.log(`Documentos com endereço do Wix: ${resultado.documentosComEnderecoDoWix}${resultado.documentosComEnderecoDoWix ? "  <-- CONFERIR" : ""}`);
  if (resultado.documentosComEnderecoDoWix) process.exitCode = 1;
}

principal().then(
  () => process.exit(process.exitCode ?? 0),
  (erro) => parar(`Falha na conferência: ${erro instanceof Error ? erro.message : String(erro)}`),
);
