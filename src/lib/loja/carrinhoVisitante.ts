// Carrinho de visitante e acesso ao pedido sem conta (08/11/2026). Funções
// puras, usadas pelas ações de servidor, pela página do pedido e pelos testes
// de unidade.
//
// O carrinho de quem não entrou fica num cookie httpOnly do próprio site, só
// com o id de cada produto e a quantidade ("id:quantidade|id:quantidade").
// Nada de preço, nome ou situação: o servidor lê tudo do produto a cada vez.
// Um cookie mexido à mão só pode trocar ids e quantidades, que são conferidos
// aqui e de novo contra o produto no Firestore.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ehIdDeDocumentoValido } from "../validacao.ts";
import { ITENS_MAXIMOS, QUANTIDADE_MAXIMA, quantidadeMaxima, situacaoDoProduto, type ItemDoCarrinho, type ProdutoDoCarrinho } from "./carrinho.ts";

export const NOME_COOKIE_CARRINHO_VISITANTE = "carrinho_visitante";
export const CAMINHO_COOKIE_CARRINHO_VISITANTE = "/loja";
export const VALIDADE_CARRINHO_VISITANTE_S = 30 * 24 * 60 * 60;
// Tamanho máximo aceito do cookie (20 itens de 20 caracteres cabem com folga).
const TAMANHO_MAXIMO = 1024;

// Opções do cookie (iguais na gravação e na exclusão).
export function opcoesDoCookieDoVisitante(producao: boolean) {
  return {
    httpOnly: true,
    secure: producao,
    sameSite: "lax" as const,
    path: CAMINHO_COOKIE_CARRINHO_VISITANTE,
    maxAge: VALIDADE_CARRINHO_VISITANTE_S,
  };
}

// Lê o cookie. Qualquer parte fora do formato é ignorada; ids repetidos
// ficam só uma vez (a primeira); no máximo ITENS_MAXIMOS itens.
export function lerCarrinhoDoVisitante(valor: string | undefined | null): ItemDoCarrinho[] {
  if (typeof valor !== "string" || !valor || valor.length > TAMANHO_MAXIMO) return [];
  const itens: ItemDoCarrinho[] = [];
  for (const parte of valor.split("|")) {
    const correspondencia = /^([A-Za-z0-9]{1,40}):(\d{1,2})$/.exec(parte);
    if (!correspondencia) continue;
    const [, produtoId, texto] = correspondencia;
    const quantidade = Number(texto);
    if (!ehIdDeDocumentoValido(produtoId) || quantidade < 1 || quantidade > QUANTIDADE_MAXIMA) continue;
    if (itens.some((item) => item.produtoId === produtoId)) continue;
    itens.push({ produtoId, quantidade });
    if (itens.length >= ITENS_MAXIMOS) break;
  }
  return itens;
}

export function escreverCarrinhoDoVisitante(itens: ItemDoCarrinho[]): string {
  return itens
    .filter((item) => ehIdDeDocumentoValido(item.produtoId) && /^[A-Za-z0-9]+$/.test(item.produtoId) && item.quantidade >= 1)
    .slice(0, ITENS_MAXIMOS)
    .map((item) => `${item.produtoId}:${Math.min(item.quantidade, QUANTIDADE_MAXIMA)}`)
    .join("|");
}

// Soma o carrinho do visitante ao da conta, ao entrar ou criar a conta. Só
// entram produtos que continuam na loja e disponíveis; a soma respeita o
// máximo de cada tipo (sem erro: o excedente fica de fora) e o limite de
// itens diferentes.
export function mesclarCarrinhos(daConta: ItemDoCarrinho[], doVisitante: ItemDoCarrinho[], produtos: Map<string, ProdutoDoCarrinho>): ItemDoCarrinho[] {
  const resultado = daConta.map((item) => ({ ...item }));
  for (const item of doVisitante) {
    const produto = produtos.get(item.produtoId);
    if (!produto || situacaoDoProduto(produto) !== "ok") continue;
    const maximo = quantidadeMaxima(produto.tipo);
    const existente = resultado.find((linha) => linha.produtoId === item.produtoId);
    if (existente) {
      existente.quantidade = Math.min(existente.quantidade + item.quantidade, maximo);
    } else if (resultado.length < ITENS_MAXIMOS) {
      resultado.push({ produtoId: item.produtoId, quantidade: Math.min(item.quantidade, maximo) });
    }
  }
  return resultado;
}

// ---------- Acesso ao pedido sem conta ----------

// Token aleatório forte do pedido de visitante: vai só na volta da Stripe
// (/loja/pedido/{id}?t=TOKEN); no Firestore fica só o hash.
export function gerarTokenDoPedido(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashDoToken(token) };
}

export function hashDoToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

// Confere o token contra o hash guardado, em tempo constante.
export function tokenConfere(token: unknown, hashGuardado: string | null): boolean {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  if (typeof hashGuardado !== "string" || !/^[0-9a-f]{64}$/.test(hashGuardado)) return false;
  return timingSafeEqual(Buffer.from(hashDoToken(token), "hex"), Buffer.from(hashGuardado, "hex"));
}

export type AcessoAoPedido = "ver" | "entrar" | "nao-encontrado";

// Quem pode ver a página do pedido: o dono logado, ou quem tem o token válido
// (pedido de visitante e também de conta, para a volta da Stripe funcionar
// sem sessão). Sem sessão e sem token: vai para entrar. O resto: 404, sem
// dizer se o pedido existe.
export function decidirAcessoAoPedido({
  pedido,
  clienteUid,
  token,
}: {
  pedido: { clienteUid: string | null; tokenHash: string | null } | null;
  clienteUid: string | null;
  token: unknown;
}): AcessoAoPedido {
  const temToken = typeof token === "string" && token.length > 0;
  if (pedido && clienteUid && pedido.clienteUid === clienteUid) return "ver";
  if (temToken) return pedido && tokenConfere(token, pedido.tokenHash) ? "ver" : "nao-encontrado";
  if (!clienteUid) return "entrar";
  return "nao-encontrado";
}
