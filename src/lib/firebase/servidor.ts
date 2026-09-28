// Firebase Admin SDK: SOMENTE no servidor.
// A linha abaixo faz o build falhar se este arquivo for importado por
// qualquer código que vá para o navegador.
import "server-only";

import * as admin from "firebase-admin";

const NOME_APP = "abte-servidor";

function obterApp(): admin.app.App {
  const existente = admin.apps.find((app) => app && app.name === NOME_APP);
  if (existente) return admin.app(NOME_APP);

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // No .env.local a chave fica numa linha só, com "\n" escritos; aqui eles
  // voltam a ser quebras de linha.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    // A mensagem cita só os nomes das variáveis, nunca os valores.
    throw new Error(
      "Credenciais do Admin SDK ausentes. Preencha FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY no .env.local.",
    );
  }

  return admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }), projectId }, NOME_APP);
}

export function authAdmin(): admin.auth.Auth {
  return admin.auth(obterApp());
}

export function firestoreAdmin(): admin.firestore.Firestore {
  return admin.firestore(obterApp());
}
