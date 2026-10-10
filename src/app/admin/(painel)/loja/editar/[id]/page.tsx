import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { FormularioProduto } from "@/app/admin/_componentes/FormularioProduto/FormularioProduto";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerProdutos, listarTopicosAtivos } from "@/lib/dados/colecoes";
import { ehIdDeDocumentoValido } from "@/lib/validacao";

export const metadata: Metadata = { title: "Editar produto" };

export default async function PaginaEditarProduto({ params }: { params: Promise<{ id: string }> }) {
  await exigirPapelDoPainel();
  const { id } = await params;
  // Id inválido ou inexistente: volta para a lista.
  if (!ehIdDeDocumentoValido(id)) redirect("/admin/loja");
  const produto = (await lerProdutos().doc(id).get()).data();
  if (!produto) redirect("/admin/loja");
  const categorias = await listarTopicosAtivos("categoriaDeProduto");
  // Só os campos do formulário; as datas não vão para o navegador.
  const paraTela = {
    id: produto.id,
    nome: produto.nome,
    slug: produto.slug,
    descricao: produto.descricao,
    preco: produto.preco,
    precoPromocional: produto.precoPromocional,
    categoria: produto.categoria,
    tipo: produto.tipo,
    status: produto.status,
    selo: produto.selo,
    ordem: produto.ordem,
    publicado: produto.publicado,
  };

  return (
    <div>
      <CabecalhoDoPainel titulo="Editar produto" descricao="Atualize os dados do produto." />
      <FormularioProduto produto={paraTela} categorias={categorias.map(({ id: idCategoria, nome }) => ({ id: idCategoria, nome }))} />
    </div>
  );
}
