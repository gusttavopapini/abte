// Sessão de cliente da loja, validada no servidor. SOMENTE no servidor.
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { authAdmin } from "@/lib/firebase/admin-auth";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { ehClienteDaLoja } from "@/lib/loja/contas";
import { NOME_COOKIE_CLIENTE, ROTA_ENTRAR_LOJA } from "./constantes";
import { verificarCookieDeSessao } from "./verificacao";

export type ClienteDaSessao = { uid: string; email: string; nome: string };

// Lê o cookie da loja, confere assinatura e revogação e se a conta é de
// cliente (tem documento em "clientes"). Sem isso, devolve null. O cookie do
// painel (__session) nunca é lido aqui.
export const lerSessaoCliente = cache(async (): Promise<ClienteDaSessao | null> => {
  const cookie = (await cookies()).get(NOME_COOKIE_CLIENTE)?.value;
  const sessao = await verificarCookieDeSessao(authAdmin(), cookie);
  if (!sessao) return null;
  try {
    if (!(await ehClienteDaLoja(firestoreAdmin(), sessao.uid))) return null;
  } catch {
    return null;
  }
  return { uid: sessao.uid, email: sessao.email, nome: sessao.nome };
});

// Use no início de toda página e ação da loja que exige conta. Sem sessão de
// cliente, vai para o login da loja e depois volta para "voltarPara".
export async function exigirSessaoCliente(voltarPara: string): Promise<ClienteDaSessao> {
  const cliente = await lerSessaoCliente();
  if (!cliente) redirect(`${ROTA_ENTRAR_LOJA}?voltar=${encodeURIComponent(voltarPara)}`);
  return cliente;
}
