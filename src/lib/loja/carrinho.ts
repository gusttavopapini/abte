// Regras do carrinho da loja. Funções puras, usadas pelas ações de servidor e
// pelos testes de unidade. O carrinho guarda só o id do produto e a
// quantidade: preço, nome e disponibilidade são lidos do produto no servidor
// toda vez, nunca vêm do navegador. Não há pagamento nem pedido.
import { precoAtual } from "../produtos.ts";

export type ItemDoCarrinho = { produtoId: string; quantidade: number };

// O que o carrinho precisa saber do produto (lido no servidor).
export type ProdutoDoCarrinho = {
  id: string;
  nome: string;
  slug: string;
  preco: number;
  precoPromocional: number | null;
  tipo: "fisico" | "digital";
  status: "disponivel" | "esgotado";
  publicado: boolean;
  excluido: boolean;
};

export const QUANTIDADE_MAXIMA = 10;
export const ITENS_MAXIMOS = 20;

// Produto digital: uma unidade basta. Físico: até QUANTIDADE_MAXIMA.
export function quantidadeMaxima(tipo: ProdutoDoCarrinho["tipo"]): number {
  return tipo === "digital" ? 1 : QUANTIDADE_MAXIMA;
}

export type Situacao = "ok" | "esgotado" | "indisponivel";

// Indisponível: removido, na lixeira ou despublicado. Esgotado: continua na
// loja, mas não entra no total.
export function situacaoDoProduto(produto: ProdutoDoCarrinho | undefined): Situacao {
  if (!produto || produto.excluido || !produto.publicado) return "indisponivel";
  return produto.status === "esgotado" ? "esgotado" : "ok";
}

export type LinhaDoCarrinho = {
  produtoId: string;
  nome: string;
  slug: string | null;
  quantidade: number;
  precoUnitario: number | null;
  subtotal: number;
  situacao: Situacao;
};

export type ResumoDoCarrinho = { linhas: LinhaDoCarrinho[]; total: number; unidades: number; temProblema: boolean };

// Monta o que a tela mostra, com os preços atuais. Só itens "ok" entram no total.
export function montarResumoDoCarrinho(itens: ItemDoCarrinho[], produtos: Map<string, ProdutoDoCarrinho>): ResumoDoCarrinho {
  const linhas = itens.map((item): LinhaDoCarrinho => {
    const produto = produtos.get(item.produtoId);
    const situacao = situacaoDoProduto(produto);
    const quantidade = produto ? Math.min(item.quantidade, quantidadeMaxima(produto.tipo)) : item.quantidade;
    const precoUnitario = produto && situacao !== "indisponivel" ? precoAtual(produto) : null;
    return {
      produtoId: item.produtoId,
      nome: produto && situacao !== "indisponivel" ? produto.nome : "Produto fora da loja",
      slug: produto && situacao !== "indisponivel" ? produto.slug : null,
      quantidade,
      precoUnitario,
      subtotal: situacao === "ok" && precoUnitario !== null ? precoUnitario * quantidade : 0,
      situacao,
    };
  });
  return {
    linhas,
    total: linhas.reduce((soma, linha) => soma + linha.subtotal, 0),
    unidades: linhas.filter((linha) => linha.situacao === "ok").reduce((soma, linha) => soma + linha.quantidade, 0),
    temProblema: linhas.some((linha) => linha.situacao !== "ok"),
  };
}

// Lê a quantidade enviada pelo formulário: inteiro de 0 a QUANTIDADE_MAXIMA
// (0 só faz sentido para remover). Qualquer outra coisa é recusada.
export function lerQuantidade(valor: unknown): number | null {
  if (typeof valor !== "string" || !/^\d{1,2}$/.test(valor.trim())) return null;
  const numero = Number(valor.trim());
  return numero <= QUANTIDADE_MAXIMA ? numero : null;
}

// Itens guardados no Firestore, conferidos (o documento pode ter sido mexido).
export function lerItensGuardados(valor: unknown): ItemDoCarrinho[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((item): item is ItemDoCarrinho =>
      typeof item === "object" && item !== null && typeof item.produtoId === "string" && Number.isInteger(item.quantidade) && item.quantidade > 0,
    )
    .slice(0, ITENS_MAXIMOS);
}

export type Alteracao = { ok: true; itens: ItemDoCarrinho[] } | { ok: false; erro: string };

// Adiciona unidades de um produto disponível (soma com o que já está no
// carrinho, até o máximo do tipo do produto).
export function adicionarItem(itens: ItemDoCarrinho[], produto: ProdutoDoCarrinho, quantidade: number): Alteracao {
  const situacao = situacaoDoProduto(produto);
  if (situacao === "indisponivel") return { ok: false, erro: "Este produto não está mais na loja." };
  if (situacao === "esgotado") return { ok: false, erro: "Este produto está esgotado." };
  if (quantidade < 1) return { ok: false, erro: "Escolha pelo menos uma unidade." };
  const maximo = quantidadeMaxima(produto.tipo);
  const existente = itens.find((item) => item.produtoId === produto.id);
  if (!existente && itens.length >= ITENS_MAXIMOS) return { ok: false, erro: `O carrinho aceita até ${ITENS_MAXIMOS} produtos diferentes.` };
  const nova = (existente?.quantidade ?? 0) + quantidade;
  if (nova > maximo) {
    return { ok: false, erro: maximo === 1 ? "Este produto digital já está no carrinho." : `Cada produto aceita até ${maximo} unidades no carrinho.` };
  }
  return {
    ok: true,
    itens: existente
      ? itens.map((item) => (item.produtoId === produto.id ? { ...item, quantidade: nova } : item))
      : [...itens, { produtoId: produto.id, quantidade: nova }],
  };
}

// Troca a quantidade de um item (0 remove). Produto indisponível ou esgotado
// só pode ser removido.
export function definirQuantidade(itens: ItemDoCarrinho[], produtoId: string, quantidade: number, produto: ProdutoDoCarrinho | undefined): Alteracao {
  if (!itens.some((item) => item.produtoId === produtoId)) return { ok: false, erro: "Este produto não está no carrinho." };
  if (quantidade === 0) return { ok: true, itens: itens.filter((item) => item.produtoId !== produtoId) };
  const situacao = situacaoDoProduto(produto);
  if (situacao !== "ok" || !produto) return { ok: false, erro: "Este produto não está disponível. Você pode removê-lo do carrinho." };
  if (quantidade > quantidadeMaxima(produto.tipo)) {
    return { ok: false, erro: produto.tipo === "digital" ? "Produto digital: uma unidade basta." : `Cada produto aceita até ${QUANTIDADE_MAXIMA} unidades no carrinho.` };
  }
  return { ok: true, itens: itens.map((item) => (item.produtoId === produtoId ? { ...item, quantidade } : item)) };
}
