// Firebase no NAVEGADOR. Usado só na tela de login do painel
// (entrar com e-mail e senha e pedir o e-mail de redefinição de senha).
// O navegador nunca acessa o Firestore: dados passam sempre pelo servidor.
import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, inMemoryPersistence, initializeAuth, type Auth } from "firebase/auth";

// Tudo que identifica o projeto vem das variáveis de ambiente (.env.local).
// As variáveis NEXT_PUBLIC_ precisam ser lidas uma a uma, por nome, para o
// Next.js incluí-las no código do navegador.
const configuracao: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let authCliente: Auth | undefined;

export function obterAuthCliente(): Auth {
  if (authCliente) return authCliente;
  const app = getApps().length ? getApp() : initializeApp(configuracao);
  try {
    // Sem persistência no navegador: o login só serve para gerar o token,
    // que é trocado por um cookie de sessão no servidor.
    authCliente = initializeAuth(app, { persistence: inMemoryPersistence });
  } catch {
    // Já inicializado (ex.: recarga em desenvolvimento).
    authCliente = getAuth(app);
  }
  // E-mails do Firebase (redefinição de senha) em português do Brasil.
  authCliente.languageCode = "pt-BR";
  return authCliente;
}
