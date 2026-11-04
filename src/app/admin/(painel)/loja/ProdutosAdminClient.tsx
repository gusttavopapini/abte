"use client";

import { AcoesDoItem } from "@/app/admin/_componentes/AcoesDoItem/AcoesDoItem";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { MensagensDoPainel } from "@/app/admin/_componentes/MensagensDoPainel/MensagensDoPainel";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { ListaDoPainel, type ItemDaLista, type OrdenacaoDaLista } from "@/app/admin/_componentes/ListaDoPainel/ListaDoPainel";
import { Botao } from "@/components/Botao/Botao";

export type LinhaDeProduto = { id: string; nome: string; slug: string; categoria: string; preco: string; situacao: string; publicado: boolean };

// O que se perde ao excluir um produto de vez (texto da confirmação reforçada).
const PERDAS = [
  "O nome, a descrição, o preço, a categoria e a galeria deste produto.",
  "A página do produto na loja deixa de existir.",
  "Se ele estiver no carrinho de clientes, aparece lá como indisponível.",
  "As imagens não são apagadas: continuam na biblioteca de mídia.",
];

function Acoes({ produto, naLixeira, podeExcluirDeVez }: { produto: LinhaDeProduto; naLixeira: boolean; podeExcluirDeVez: boolean }) {
  return (
    <AcoesDoItem
      colecao="produtos"
      id={produto.id}
      nome={produto.nome}
      situacao={naLixeira ? "lixeira" : produto.publicado ? "publicado" : "rascunho"}
      hrefEditar={`/admin/loja/editar/${produto.id}`}
      hrefNoSite={produto.slug ? `/loja/produto/${produto.slug}` : null}
      podeExcluirDeVez={podeExcluirDeVez}
      podeDuplicar
      prefixoDaCopia="/admin/loja/editar/"
      perdas={PERDAS}
    />
  );
}

const ORDENACOES: OrdenacaoDaLista[] = [
  { valor: "loja", rotulo: "Ordem da loja", chave: "ordem", direcao: "asc" },
  { valor: "nome", rotulo: "Nome, de A a Z", chave: "nome", direcao: "asc" },
  { valor: "nome-inverso", rotulo: "Nome, de Z a A", chave: "nome", direcao: "desc" },
  { valor: "categoria", rotulo: "Categoria, de A a Z", chave: "categoria", direcao: "asc" },
];

export function ProdutosAdminClient({ ativos, excluidos, salvo, podeExcluirDeVez }: { ativos: LinhaDeProduto[]; excluidos: LinhaDeProduto[]; salvo: boolean; podeExcluirDeVez: boolean }) {
  // A ordem que chega do servidor já é a da loja (Ordem e, no empate, o nome).
  const itens: ItemDaLista[] = [...ativos.map((produto) => ({ produto, naLixeira: false })), ...excluidos.map((produto) => ({ produto, naLixeira: true }))].map(({ produto, naLixeira }, indice) => {
    const situacao = naLixeira ? "lixeira" : produto.publicado ? "publicado" : "rascunho";
    return {
      id: produto.id,
      nome: produto.nome,
      busca: produto.categoria,
      situacao,
      chaves: { ordem: indice, nome: produto.nome, categoria: produto.categoria },
      celulas: [produto.nome, produto.categoria, produto.preco, produto.situacao, <SeloStatus key="situacao" status={situacao} />],
      acoes: <Acoes produto={produto} naLixeira={naLixeira} podeExcluirDeVez={podeExcluirDeVez} />,
    };
  });

  return (
    <div>
      <CabecalhoDoPainel
        trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Loja" }]}
        titulo="Loja: produtos"
        descricao={`Cadastro dos produtos da loja. Só os publicados aparecem em /loja. Não há pagamento online: a finalização da compra aparece como “em breve”.${podeExcluirDeVez ? "" : " Só o administrador exclui de vez."}`}
        acao={<Botao href="/admin/loja/novo">Adicionar produto</Botao>}
      />
      <MensagensDoPainel inicial={salvo ? { tipo: "sucesso", texto: "Produto salvo." } : undefined}>
        <ListaDoPainel
          colecao="produtos"
          itens={itens}
          colunas={["Nome", "Categoria", "Preço", "Estoque", "Na loja"]}
          ordenacoes={ORDENACOES}
          rotulos={{ singular: "produto", plural: "produtos", publicados: "Na loja", rascunhos: "Fora da loja" }}
          rotuloDaBusca="Buscar pelo nome ou categoria"
          comSituacao
          estadoVazio={
            <>
              <p className="tipo-texto">Nenhum produto cadastrado. Cada produto precisa de uma categoria: cadastre antes em Loja: categorias.</p>
              <Botao href="/admin/loja/novo" variante="secundario">Adicionar o primeiro produto</Botao>
            </>
          }
        />
      </MensagensDoPainel>
    </div>
  );
}
