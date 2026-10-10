"use server";

// Ações de servidor da conta de cliente da loja. Nada aqui dá acesso ao
// painel: o cliente não tem a custom claim "papel" e o cookie da loja só vale
// em /loja. Mensagens sempre em português, sem detalhe técnico.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authAdmin } from "@/lib/firebase/admin-auth";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { CAMINHO_COOKIE_CLIENTE, NOME_COOKIE_CLIENTE, VALIDADE_SESSAO_CLIENTE_MS } from "@/lib/auth/constantes";
import { lerSessaoCliente } from "@/lib/auth/sessao-cliente";
import { validarCadastroDeCliente, type CampoDoCadastro } from "@/lib/loja/cadastro";
import { criarContaDeCliente, ehClienteDaLoja, excluirContaDeCliente } from "@/lib/loja/contas";

export type RespostaDoCadastro = { ok: boolean; mensagem: string; erros?: Partial<Record<CampoDoCadastro, string>> };

const SERVICOS = () => ({ auth: authAdmin(), db: firestoreAdmin() });

// Cria a conta pelo servidor (o cadastro público do Firebase fica desligado).
// Depois disso, o navegador faz o login e chama criarSessaoCliente.
export async function cadastrarCliente(dados: FormData): Promise<RespostaDoCadastro> {
  const resultado = validarCadastroDeCliente(dados);
  if (!resultado.ok) {
    if (resultado.robo) return { ok: false, mensagem: "Não foi possível criar a conta agora. Tente de novo em instantes." };
    return { ok: false, mensagem: "Confira os campos marcados.", erros: resultado.erros };
  }
  const criacao = await criarContaDeCliente(SERVICOS(), resultado.dados);
  if (!criacao.ok) {
    if (criacao.motivo === "email-em-uso") {
      return { ok: false, mensagem: "Confira os campos marcados.", erros: { email: "Já existe uma conta com este e-mail. Entre ou use \"Esqueci minha senha\"." } };
    }
    return { ok: false, mensagem: "Não foi possível criar a conta agora. Tente de novo em instantes." };
  }
  return { ok: true, mensagem: "Conta criada." };
}

// Confere um token de login feito agora (últimos 5 minutos) e não revogado.
async function verificarLoginRecente(idToken: unknown) {
  if (typeof idToken !== "string" || !idToken) return null;
  try {
    const token = await authAdmin().verifyIdToken(idToken, true);
    if (Date.now() / 1000 - token.auth_time > 5 * 60) return null;
    return token;
  } catch {
    return null;
  }
}

export type ResultadoDoLogin = { ok: true } | { ok: false; motivo: "nao-cliente" | "erro" };

// Troca o token do login (feito no navegador) pelo cookie de sessão da loja.
// Só cria a sessão para contas de cliente (com documento em "clientes").
export async function criarSessaoCliente(idToken: string): Promise<ResultadoDoLogin> {
  const token = await verificarLoginRecente(idToken);
  if (!token) return { ok: false, motivo: "erro" };
  try {
    if (!(await ehClienteDaLoja(firestoreAdmin(), token.uid))) return { ok: false, motivo: "nao-cliente" };
    const cookie = await authAdmin().createSessionCookie(idToken, { expiresIn: VALIDADE_SESSAO_CLIENTE_MS });
    (await cookies()).set(NOME_COOKIE_CLIENTE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: CAMINHO_COOKIE_CLIENTE,
      maxAge: VALIDADE_SESSAO_CLIENTE_MS / 1000,
    });
    return { ok: true };
  } catch {
    return { ok: false, motivo: "erro" };
  }
}

// "Sair": revoga a sessão no Firebase e apaga o cookie da loja.
export async function encerrarSessaoCliente(): Promise<void> {
  const loja = await cookies();
  const cookie = loja.get(NOME_COOKIE_CLIENTE)?.value;
  if (cookie) {
    try {
      const token = await authAdmin().verifySessionCookie(cookie);
      await authAdmin().revokeRefreshTokens(token.sub);
    } catch {
      // Sessão já inválida: basta apagar o cookie.
    }
  }
  loja.delete({ name: NOME_COOKIE_CLIENTE, path: CAMINHO_COOKIE_CLIENTE });
  redirect("/loja");
}

// Exclui a conta do cliente logado. Exige a senha de novo (login recente da
// mesma conta), para ninguém excluir a conta de outra pessoa com o
// computador aberto. Deu certo: vai para a loja, que mostra a confirmação
// (a página "Minha conta" não existe mais sem sessão).
export async function excluirContaCliente(idToken: string): Promise<{ ok: boolean; mensagem: string }> {
  const sessao = await lerSessaoCliente();
  if (!sessao) return { ok: false, mensagem: "Sua sessão terminou. Entre de novo para excluir a conta." };
  const token = await verificarLoginRecente(idToken);
  if (!token || token.uid !== sessao.uid) return { ok: false, mensagem: "Não foi possível confirmar sua senha. Tente de novo." };
  try {
    await excluirContaDeCliente(SERVICOS(), sessao.uid);
  } catch (erro) {
    console.error("Falha ao excluir conta de cliente:", erro);
    return { ok: false, mensagem: "Não foi possível excluir a conta agora. Tente de novo em instantes." };
  }
  (await cookies()).delete({ name: NOME_COOKIE_CLIENTE, path: CAMINHO_COOKIE_CLIENTE });
  redirect("/loja?conta=excluida");
}
