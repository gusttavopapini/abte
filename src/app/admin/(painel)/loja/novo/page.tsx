import type { Metadata } from "next";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { FormularioProduto } from "@/app/admin/_componentes/FormularioProduto/FormularioProduto";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { listarTopicosAtivos } from "@/lib/dados/colecoes";

export const metadata: Metadata = { title: "Novo produto" };

export default async function PaginaNovoProduto() {
  await exigirPapelDoPainel();
  const categorias = await listarTopicosAtivos("categoriaDeProduto");
  return (
    <div>
      <CabecalhoDoPainel trilha={[{ rotulo: "Loja", href: "/admin/loja" }, { rotulo: "Novo produto" }]} titulo="Novo produto" descricao="Preencha os dados do produto. Os campos com * são obrigatórios; preços aparecem na loja só como informação (não há pagamento online)." />
      <FormularioProduto produto={null} categorias={categorias.map(({ id, nome }) => ({ id, nome }))} />
    </div>
  );
}
