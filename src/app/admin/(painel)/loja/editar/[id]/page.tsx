import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { FormularioProduto } from "@/app/admin/_componentes/FormularioProduto/FormularioProduto";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerProdutos, listarTopicosAtivos } from "@/lib/dados/colecoes";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
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
  const imagens = await imagensAtivasPorId(produto.imagens.map((imagem) => imagem.midiaId));
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
    galeria: produto.imagens.map(({ midiaId }) => ({ id: midiaId, imagem: imagens.get(midiaId) ?? null })),
  };

  return (
    <div>
      <CabecalhoDoPainel trilha={[{ rotulo: "Loja", href: "/admin/loja" }, { rotulo: "Editar produto" }]} titulo="Editar produto" descricao="Atualize os dados do produto. Os campos com * são obrigatórios; preços aparecem na loja só como informação (não há pagamento online)." />
      <FormularioProduto produto={paraTela} categorias={categorias.map(({ id: idCategoria, nome }) => ({ id: idCategoria, nome }))} />
    </div>
  );
}
