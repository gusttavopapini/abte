import type { Metadata } from "next";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerProdutos, lerTopicos, ordenarProdutos } from "@/lib/dados/colecoes";
import { formatarPreco } from "@/lib/produtos";
import { ProdutosAdminClient, type LinhaDeProduto } from "./ProdutosAdminClient";

export const metadata: Metadata = { title: "Loja: produtos" };

export default async function PaginaAdminLoja({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  await exigirPapelDoPainel();
  const [produtos, categorias] = await Promise.all([lerProdutos().get(), lerTopicos("categoriaDeProduto").get()]);
  const nomeDaCategoria = new Map(categorias.docs.map((documento) => [documento.id, documento.data().nome]));

  // Só o que a tela usa, já em texto.
  const linhas = ordenarProdutos(produtos.docs.map((documento) => documento.data())).map((produto): LinhaDeProduto & { excluido: boolean } => ({
    id: produto.id,
    nome: produto.nome,
    categoria: nomeDaCategoria.get(produto.categoria) ?? "Sem categoria",
    preco: produto.precoPromocional !== null ? `${formatarPreco(produto.precoPromocional)} (de ${formatarPreco(produto.preco)})` : formatarPreco(produto.preco),
    situacao: produto.status === "esgotado" ? "Esgotado" : "Disponível",
    publicado: produto.publicado,
    excluido: produto.excluidoEm !== null,
  }));

  return (
    <ProdutosAdminClient
      ativos={linhas.filter((linha) => !linha.excluido)}
      excluidos={linhas.filter((linha) => linha.excluido)}
      salvo={(await searchParams).salvo === "1"}
    />
  );
}
