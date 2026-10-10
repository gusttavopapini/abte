import type { Metadata } from "next";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerTopicos, ordenarTopicos } from "@/lib/dados/colecoes";
import type { Topico } from "@/lib/dados/tipos";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { GerenciadorDeTopicos } from "@/app/admin/_componentes/GerenciadorDeTopicos/GerenciadorDeTopicos";

export const metadata: Metadata = { title: "Loja: categorias" };

export default async function PaginaCategoriasDaLoja() {
  await exigirPapelDoPainel();
  const todas = ordenarTopicos((await lerTopicos("categoriaDeProduto").get()).docs.map((documento) => documento.data()));
  // Só os campos que a tela usa; as datas não vão para o navegador.
  const paraTela = (lista: Topico[]) => lista.map(({ id, nome, slug, ordem }) => ({ id, nome, slug, ordem }));

  return (
    <div>
      <CabecalhoDoPainel titulo="Loja: categorias" descricao="Categorias que organizam os produtos na loja." />
      <GerenciadorDeTopicos
        tipo="categoriaDeProduto"
        comOrdem
        prefixoDoEndereco="/loja?categoria="
        titulo="Categorias de produto"
        descricao="Cada produto tem uma categoria. Elas aparecem como filtro na loja, na ordem definida aqui."
        ativos={paraTela(todas.filter((categoria) => !categoria.excluidoEm))}
        excluidos={paraTela(todas.filter((categoria) => categoria.excluidoEm))}
      />
    </div>
  );
}
