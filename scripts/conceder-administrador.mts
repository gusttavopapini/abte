// Dá o papel "administrador" a um usuário que já existe no Firebase Authentication.
// Uso: npm run admin:conceder -- email@exemplo.com
//
// Lê as credenciais do Admin SDK do .env.local e nunca as exibe.
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const PAPEL = "administrador";

async function principal() {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error("Informe o e-mail. Exemplo: npm run admin:conceder -- email@exemplo.com");
    process.exit(1);
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      "Credenciais do Admin SDK ausentes no .env.local " +
        "(FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).",
    );
    process.exit(1);
  }

  const auth = getAuth(initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }));

  let usuario;
  try {
    usuario = await auth.getUserByEmail(email);
  } catch {
    console.error(`Nenhum usuário com o e-mail ${email} no projeto ${projectId}.`);
    console.error("Crie o usuário primeiro no console: Authentication > Usuários > Adicionar usuário.");
    process.exit(1);
  }

  // Mantém outras claims que o usuário já tenha.
  await auth.setCustomUserClaims(usuario.uid, { ...(usuario.customClaims ?? {}), papel: PAPEL });
  console.log(`Pronto: ${email} agora tem o papel "${PAPEL}" no projeto ${projectId}.`);
  console.log("Se essa pessoa já estava logada no painel, ela precisa sair e entrar de novo.");
}

principal().catch(() => {
  // Não mostra detalhes técnicos que possam conter dados da credencial.
  console.error("Não foi possível conceder o papel. Confira as credenciais no .env.local e a conexão com a internet.");
  process.exit(1);
});
