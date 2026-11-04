import type { Metadata } from "next";
import { papelPodeExecutar } from "@/lib/auth/papeis";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerTopicos, ordenarTopicos } from "@/lib/dados/colecoes";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { GerenciadorDeTopicos } from "@/app/admin/_componentes/GerenciadorDeTopicos/GerenciadorDeTopicos";
import { topicosNaTela } from "@/app/admin/_componentes/GerenciadorDeTopicos/topicosNaTela";

export const metadata: Metadata = { title: "Loja: categorias" };

export default async function PaginaCategoriasDaLoja() {
  const usuario = await exigirPapelDoPainel();
  const { ativos, excluidos } = await topicosNaTela(ordenarTopicos((await lerTopicos("categoriaDeProduto").get()).docs.map((documento) => documento.data())));

  return (
    <div>
      <CabecalhoDoPainel trilha={[{ rotulo: "Loja", href: "/admin/loja" }, { rotulo: "Categorias" }]} titulo="Loja: categorias" descricao="Categorias que organizam os produtos na loja. Criar, renomear e mudar a ordem; o menu Ações de cada uma move para a lixeira, restaura e, para o administrador, exclui de vez." />
      <GerenciadorDeTopicos
        tipo="categoriaDeProduto"
        comOrdem
        comImagem
        ondeAparece="sem uso no site desde 29/10/2026"
        prefixoDoEndereco="/loja?categoria="
        titulo="Categorias de produto"
        descricao="Cada produto tem uma categoria. Elas aparecem como filtro na loja, na ordem definida aqui."
        ativos={ativos}
        excluidos={excluidos}
        podeExcluirDeVez={papelPodeExecutar(usuario.papel, "conteudo.excluirDeVez")}
      />
    </div>
  );
}
