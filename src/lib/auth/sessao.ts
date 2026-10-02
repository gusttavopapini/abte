// Sessão do painel, validada no servidor em toda rota do /admin.
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { authAdmin } from "@/lib/firebase/admin-auth";
import { NOME_COOKIE_SESSAO, ROTA_LOGIN } from "./constantes";
import { decidirAcessoAoPainel, ehPapelDoPainel, type PapelDoPainel } from "./papeis";

type UsuarioDaSessao = {
  uid: string;
  email: string;
  nome: string;
  papel: PapelDoPainel | null;
};

type UsuarioDoPainel = UsuarioDaSessao & { papel: PapelDoPainel };

// Lê e valida o cookie de sessão. Confere também se a sessão foi revogada
// (ex.: depois de "Sair" ou de uma troca de senha). Retorna null se não houver
// sessão válida. O cache evita repetir a consulta ao Firebase quando o layout
// e a página do painel leem a sessão na mesma requisição.
export const lerSessao = cache(async (): Promise<UsuarioDaSessao | null> => {
  const cookie = (await cookies()).get(NOME_COOKIE_SESSAO)?.value;
  if (!cookie) return null;

  try {
    const token = await authAdmin().verifySessionCookie(cookie, true);
    const papel = ehPapelDoPainel(token.papel) ? token.papel : null;
    let nome = typeof token.name === "string" ? token.name : "";
    if (!nome) {
      // O nome de exibição não vem no token se foi definido depois do login.
      const usuario = await authAdmin().getUser(token.uid);
      nome = usuario.displayName ?? "";
    }
    return { uid: token.uid, email: token.email ?? "", nome, papel };
  } catch {
    return null;
  }
});

type ResultadoPainel =
  | { situacao: "autorizado"; usuario: UsuarioDoPainel }
  | { situacao: "sem-papel"; usuario: UsuarioDaSessao };

// Usada pelo layout do painel, que precisa saber o motivo da recusa.
// Sem sessão: redireciona para o login. Sem papel: devolve "sem-papel", e o
// layout mostra "Acesso não autorizado" sem nenhum dado do painel.
export async function exigirSessaoDoPainel(): Promise<ResultadoPainel> {
  const usuario = await lerSessao();
  if (!usuario) redirect(ROTA_LOGIN);
  const decisao = decidirAcessoAoPainel(usuario);
  if (!decisao.permitido) return { situacao: "sem-papel", usuario };
  return { situacao: "autorizado", usuario: { ...usuario, papel: decisao.papel } };
}

// Use no início de toda ação de servidor e de toda página do painel que lê
// dados. Falha fechada: sem sessão, redireciona para o login; sem papel,
// interrompe com erro antes de qualquer leitura ou gravação. Nas páginas, esse
// erro não aparece na tela: o layout já mostra "Acesso não autorizado".
export async function exigirPapelDoPainel(): Promise<UsuarioDoPainel> {
  const usuario = await lerSessao();
  if (!usuario) redirect(ROTA_LOGIN);
  const decisao = decidirAcessoAoPainel(usuario);
  if (!decisao.permitido) throw new Error("Acesso não autorizado ao painel.");
  return { ...usuario, papel: decisao.papel };
}
