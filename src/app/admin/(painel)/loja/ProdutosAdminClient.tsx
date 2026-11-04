"use client";

import { AcoesDoItem } from "@/app/admin/_componentes/AcoesDoItem/AcoesDoItem";
import { BuscaNaTabela } from "@/app/admin/_componentes/BuscaNaTabela/BuscaNaTabela";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { MensagensDoPainel } from "@/app/admin/_componentes/MensagensDoPainel/MensagensDoPainel";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { CelulaDoPainel, LinhaDoPainel, TabelaPainel } from "@/app/admin/_componentes/TabelaPainel/TabelaPainel";
import { Botao } from "@/components/Botao/Botao";
import estilosDaLixeira from "../listaComLixeira.module.css";

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

export function ProdutosAdminClient({ ativos, excluidos, salvo, podeExcluirDeVez }: { ativos: LinhaDeProduto[]; excluidos: LinhaDeProduto[]; salvo: boolean; podeExcluirDeVez: boolean }) {
  return (
    <div>
      <CabecalhoDoPainel
        trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Loja" }]}
        titulo="Loja: produtos"
        descricao="Cadastro dos produtos da loja. Só os publicados aparecem em /loja. Não há pagamento online: a finalização da compra aparece como “em breve”."
        acao={<Botao href="/admin/loja/novo">Adicionar produto</Botao>}
      />
      <MensagensDoPainel inicial={salvo ? { tipo: "sucesso", texto: "Produto salvo." } : undefined}>
        {ativos.length > 0 && (
          <BuscaNaTabela
            tabela="tabela-produtos"
            rotuloDaBusca="Buscar pelo nome ou categoria"
            situacoes={[{ valor: "publicado", rotulo: "Na loja" }, { valor: "rascunho", rotulo: "Fora da loja (rascunho)" }]}
            total={ativos.length}
            nomeNoSingular="produto"
            nomeNoPlural="produtos"
          />
        )}

        <TabelaPainel
          id="tabela-produtos"
          legenda="Na ordem da loja (campo Ordem; no empate, pelo nome)."
          colunas={["Nome", "Categoria", "Preço", "Estoque", "Na loja", "Ações"]}
          vazia={ativos.length === 0}
          estadoVazio={
            <>
              <p className="tipo-texto">Nenhum produto fora da lixeira. Cada produto precisa de uma categoria: cadastre antes em Loja: categorias.</p>
              <Botao href="/admin/loja/novo" variante="secundario">Adicionar um produto</Botao>
            </>
          }
        >
          {ativos.map((produto) => (
            <LinhaDoPainel key={produto.id} busca={`${produto.nome} ${produto.categoria}`} situacao={produto.publicado ? "publicado" : "rascunho"}>
              <CelulaDoPainel rotulo="Nome" destaque>{produto.nome}</CelulaDoPainel>
              <CelulaDoPainel rotulo="Categoria">{produto.categoria}</CelulaDoPainel>
              <CelulaDoPainel rotulo="Preço">{produto.preco}</CelulaDoPainel>
              <CelulaDoPainel rotulo="Estoque">{produto.situacao}</CelulaDoPainel>
              <CelulaDoPainel rotulo="Na loja"><SeloStatus status={produto.publicado ? "publicado" : "rascunho"} /></CelulaDoPainel>
              <CelulaDoPainel rotulo="Ações" acoes><Acoes produto={produto} naLixeira={false} podeExcluirDeVez={podeExcluirDeVez} /></CelulaDoPainel>
            </LinhaDoPainel>
          ))}
        </TabelaPainel>

        {excluidos.length > 0 && (
          <section className={estilosDaLixeira.lixeira} aria-labelledby="titulo-lixeira-produtos">
            <h2 id="titulo-lixeira-produtos" className={estilosDaLixeira.titulo}>Lixeira ({excluidos.length})</h2>
            <TabelaPainel
              legenda={`Produtos na lixeira não aparecem na loja. Restaurar volta o produto com a situação que ele tinha.${podeExcluirDeVez ? " Excluir de vez não tem volta." : " Só o administrador exclui de vez."}`}
              colunas={["Nome", "Categoria", "Situação", "Ações"]}
              vazia={false}
              estadoVazio={null}
            >
              {excluidos.map((produto) => (
                <LinhaDoPainel key={produto.id} busca={produto.nome}>
                  <CelulaDoPainel rotulo="Nome" destaque>{produto.nome}</CelulaDoPainel>
                  <CelulaDoPainel rotulo="Categoria">{produto.categoria}</CelulaDoPainel>
                  <CelulaDoPainel rotulo="Situação"><SeloStatus status="lixeira" /></CelulaDoPainel>
                  <CelulaDoPainel rotulo="Ações" acoes><Acoes produto={produto} naLixeira podeExcluirDeVez={podeExcluirDeVez} /></CelulaDoPainel>
                </LinhaDoPainel>
              ))}
            </TabelaPainel>
          </section>
        )}
      </MensagensDoPainel>
    </div>
  );
}
