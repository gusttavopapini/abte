import type { Metadata } from "next";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerTopicos, ordenarTopicos } from "@/lib/dados/colecoes";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { GerenciadorDeTopicos } from "@/app/admin/_componentes/GerenciadorDeTopicos/GerenciadorDeTopicos";
import { topicosNaTela } from "@/app/admin/_componentes/GerenciadorDeTopicos/topicosNaTela";

export const metadata: Metadata = { title: "Loja: categorias" };

export default async function PaginaCategoriasDaLoja() {
  await exigirPapelDoPainel();
  const { ativos, excluidos } = await topicosNaTela(ordenarTopicos((await lerTopicos("categoriaDeProduto").get()).docs.map((documento) => documento.data())));

  return (
    <div>
      <CabecalhoDoPainel titulo="Loja: categorias" descricao="Categorias que organizam os produtos na loja." />
      <GerenciadorDeTopicos
        tipo="categoriaDeProduto"
        comOrdem
        comImagem
        ondeAparece="miniatura no filtro da loja"
        prefixoDoEndereco="/loja?categoria="
        titulo="Categorias de produto"
        descricao="Cada produto tem uma categoria. Elas aparecem como filtro na loja, na ordem definida aqui."
        ativos={ativos}
        excluidos={excluidos}
      />
    </div>
  );
}
