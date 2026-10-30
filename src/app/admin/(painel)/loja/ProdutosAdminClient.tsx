"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BuscaNaTabela } from "@/app/admin/_componentes/BuscaNaTabela/BuscaNaTabela";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { CelulaDoPainel, LinhaDoPainel, TabelaPainel } from "@/app/admin/_componentes/TabelaPainel/TabelaPainel";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { excluirProduto, restaurarProduto } from "@/app/admin/acoes-produtos";
import { Botao } from "@/components/Botao/Botao";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { Modal } from "@/components/Modal/Modal";
import estilos from "./ProdutosAdminClient.module.css";

export type LinhaDeProduto = { id: string; nome: string; categoria: string; preco: string; situacao: string; publicado: boolean };

// Confirmação de exclusão: o produto vai para os excluídos (sai da loja e
// pode ser restaurado). Erro aparece dentro da janela, em português.
function ConfirmarExclusao({ produto, aoTerminar, aoCancelar }: { produto: LinhaDeProduto; aoTerminar: (mensagem: string) => void; aoCancelar: () => void }) {
  const [resposta, excluir, excluindo] = useActionState(excluirProduto, null);
  useEffect(() => {
    if (resposta?.ok) aoTerminar(resposta.mensagem);
  }, [resposta, aoTerminar]);
  return (
    <form action={excluir} className={estilos.formulario}>
      <input type="hidden" name="id" value={produto.id} />
      <p className="tipo-texto">&ldquo;{produto.nome}&rdquo; sai da loja e vai para os excluídos. Dá para restaurar depois.</p>
      {resposta?.ok === false && <Mensagem tipo="erro">{resposta.mensagem}</Mensagem>}
      <div className={estilos.botoes}>
        <Botao type="button" variante="secundario" onClick={aoCancelar}>Cancelar</Botao>
        <Botao type="submit" disabled={excluindo}>{excluindo ? "Excluindo..." : "Excluir"}</Botao>
      </div>
    </form>
  );
}

export function ProdutosAdminClient({ ativos, excluidos, salvo }: { ativos: LinhaDeProduto[]; excluidos: LinhaDeProduto[]; salvo: boolean }) {
  const [excluindo, setExcluindo] = useState<LinhaDeProduto | null>(null);
  const [aviso, setAviso] = useState<string | null>(salvo ? "Produto salvo." : null);
  const [respostaRestaurar, restaurar, restaurando] = useActionState(restaurarProduto, null);
  const fechar = useCallback(() => setExcluindo(null), []);
  const concluir = useCallback((mensagem: string) => {
    setExcluindo(null);
    setAviso(mensagem);
  }, []);

  return (
    <div className={estilos.pagina}>
      <CabecalhoDoPainel
        trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Loja" }]}
        titulo="Loja: produtos"
        descricao="Cadastro dos produtos da loja. Só os publicados aparecem em /loja. Não há pagamento online: a finalização da compra aparece como “em breve”."
        acao={<Botao href="/admin/loja/novo">Adicionar produto</Botao>}
      />
      <div aria-live="polite">{aviso && <Mensagem tipo="sucesso">{aviso}</Mensagem>}</div>
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
            <p className="tipo-texto">Nenhum produto cadastrado. Cada produto precisa de uma categoria: cadastre antes em Loja: categorias.</p>
            <Botao href="/admin/loja/novo" variante="secundario">Adicionar o primeiro produto</Botao>
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
            <CelulaDoPainel rotulo="Ações" acoes>
              <Link href={`/admin/loja/editar/${produto.id}`} className={`realce ${estilos.acao}`} aria-label={`Editar ${produto.nome}`}>Editar</Link>
              <button type="button" className={`realce ${estilos.acao}`} onClick={() => { setAviso(null); setExcluindo(produto); }} aria-label={`Excluir ${produto.nome}`}>Excluir</button>
            </CelulaDoPainel>
          </LinhaDoPainel>
        ))}
      </TabelaPainel>

      <section className={estilos.excluidos} aria-labelledby="titulo-produtos-excluidos">
        <h2 id="titulo-produtos-excluidos" className="tipo-texto-lg">Excluídos</h2>
        {respostaRestaurar && <Mensagem tipo={respostaRestaurar.ok ? "sucesso" : "erro"}>{respostaRestaurar.mensagem}</Mensagem>}
        {excluidos.length === 0 ? (
          <p className="tipo-texto">Nenhum produto excluído.</p>
        ) : (
          <ul role="list" className={estilos.lista}>
            {excluidos.map((produto) => (
              <li key={produto.id}>
                <form action={restaurar} className={estilos.linhaExcluido}>
                  <input type="hidden" name="id" value={produto.id} />
                  <span>{produto.nome}</span>
                  <Botao type="submit" variante="secundario" disabled={restaurando} aria-label={`Restaurar ${produto.nome}`}>Restaurar</Botao>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal aberto={excluindo !== null} aoFechar={fechar} titulo={excluindo ? `Excluir "${excluindo.nome}"` : "Excluir produto"}>
        {excluindo && <ConfirmarExclusao produto={excluindo} aoTerminar={concluir} aoCancelar={fechar} />}
      </Modal>
    </div>
  );
}
