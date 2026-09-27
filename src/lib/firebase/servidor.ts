// Firebase Admin SDK: SOMENTE no servidor.
// A linha abaixo faz o build falhar se este arquivo for importado por
// qualquer código que vá para o navegador.
import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const NOME_APP = "abte-servidor";

function obterApp(): App {
  const existente = getApps().find((app) => app.name === NOME_APP);
  if (existente) return getApp(NOME_APP);

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

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, NOME_APP);
}

export function authAdmin(): Auth {
  return getAuth(obterApp());
}

// Ainda não usado na etapa 1; o modelo de dados chega na etapa 3.
export function firestoreAdmin(): Firestore {
  return getFirestore(obterApp());
}
