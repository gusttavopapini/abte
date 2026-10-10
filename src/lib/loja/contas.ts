// Contas de cliente da loja no Firebase Authentication e no Firestore.
// Recebe as instâncias do Admin SDK, sem depender do Next.js: usado pelas
// ações de servidor e pelos testes no emulador (testes/sessao).
// O cliente NUNCA recebe a custom claim "papel": sem ela, o painel recusa
// (decidirAcessoAoPainel).
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { DadosDoCadastro } from "./cadastro.ts";

export const COLECAO_CLIENTES = "clientes";
export const COLECAO_CARRINHOS = "carrinhos";

// Versão do texto de consentimento mostrado no cadastro. O texto definitivo
// depende da política de privacidade, a revisar com a assessoria jurídica da ABTE.
export const VERSAO_DO_CONSENTIMENTO = "provisorio-2026-10-10";

type Servicos = { auth: Auth; db: Firestore };

export type ResultadoDaCriacao = { ok: true; uid: string } | { ok: false; motivo: "email-em-uso" | "erro" };

// Cria o usuário no Authentication (sem claims) e o documento do cliente com
// os dados mínimos. Se o Firestore falhar, desfaz o usuário criado.
export async function criarContaDeCliente({ auth, db }: Servicos, dados: DadosDoCadastro): Promise<ResultadoDaCriacao> {
  let uid: string;
  try {
    const usuario = await auth.createUser({ email: dados.email, password: dados.senha, displayName: dados.nome });
    uid = usuario.uid;
  } catch (erro) {
    const codigo = typeof erro === "object" && erro !== null && "code" in erro ? String(erro.code) : "";
    return { ok: false, motivo: codigo === "auth/email-already-exists" ? "email-em-uso" : "erro" };
  }
  try {
    const agora = new Date();
    await db.collection(COLECAO_CLIENTES).doc(uid).create({
      nome: dados.nome,
      email: dados.email,
      consentimentoEm: agora,
      versaoDoConsentimento: VERSAO_DO_CONSENTIMENTO,
      criadoEm: agora,
    });
    return { ok: true, uid };
  } catch {
    await auth.deleteUser(uid).catch(() => undefined);
    return { ok: false, motivo: "erro" };
  }
}

// Só é cliente da loja quem tem o documento em "clientes" (contas do painel não têm).
export async function ehClienteDaLoja(db: Firestore, uid: string): Promise<boolean> {
  return (await db.collection(COLECAO_CLIENTES).doc(uid).get()).exists;
}

// Exclui a conta: carrinho, dados do cliente e o usuário do Authentication.
export async function excluirContaDeCliente({ auth, db }: Servicos, uid: string): Promise<void> {
  await db.collection(COLECAO_CARRINHOS).doc(uid).delete();
  await db.collection(COLECAO_CLIENTES).doc(uid).delete();
  await auth.deleteUser(uid);
}
