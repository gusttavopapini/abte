"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { alterarItemDoCarrinho } from "@/app/loja/acoes-carrinho";
import { Botao } from "@/components/Botao/Botao";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import type { LinhaDoCarrinho } from "@/lib/loja/carrinho";
import { formatarPreco } from "@/lib/produtos";
import estilos from "./ItensDoCarrinho.module.css";

type Linha = LinhaDoCarrinho & { maximo: number };

const AVISOS: Record<LinhaDoCarrinho["situacao"], string | null> = {
  ok: null,
  esgotado: "Este produto esgotou e não entra no total.",
  indisponivel: "Este produto não está mais na loja e não entra no total.",
};

// Lista do carrinho: trocar quantidade e remover. A resposta da última ação
// aparece no topo (o item pode sair da lista depois dela).
export function ItensDoCarrinho({ linhas }: { linhas: Linha[] }) {
  const [resposta, alterar, alterando] = useActionState(alterarItemDoCarrinho, null);
  const id = useId();
  return (
    <div className={estilos.bloco}>
      {resposta && <Mensagem tipo={resposta.ok ? "sucesso" : "erro"}>{resposta.mensagem}</Mensagem>}
      <ul role="list" className={estilos.lista}>
        {linhas.map((linha) => (
          <li key={linha.produtoId} className={estilos.item}>
            <div className={estilos.descricao}>
              <h2 className={estilos.nome}>
                {linha.slug ? <Link href={`/loja/produto/${linha.slug}`}>{linha.nome}</Link> : linha.nome}
              </h2>
              {linha.precoUnitario !== null && <p>{formatarPreco(linha.precoUnitario)} cada</p>}
              {AVISOS[linha.situacao] && <p className={estilos.aviso}>{AVISOS[linha.situacao]}</p>}
              {linha.situacao === "ok" && <p>Subtotal: {formatarPreco(linha.subtotal)}</p>}
            </div>
            <div className={estilos.acoes}>
              {linha.situacao === "ok" && linha.maximo > 1 && (
                <form action={alterar} className={estilos.formulario}>
                  <input type="hidden" name="produtoId" value={linha.produtoId} />
                  <label htmlFor={`${id}-${linha.produtoId}`} className={estilos.rotulo}>Quantidade</label>
                  <select id={`${id}-${linha.produtoId}`} name="quantidade" defaultValue={String(linha.quantidade)} className={estilos.selecao}>
                    {Array.from({ length: linha.maximo }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <Botao type="submit" variante="secundario" disabled={alterando} aria-label={`Atualizar a quantidade de ${linha.nome}`}>Atualizar</Botao>
                </form>
              )}
              {linha.situacao === "ok" && linha.maximo === 1 && <p>Quantidade: 1</p>}
              <form action={alterar}>
                <input type="hidden" name="produtoId" value={linha.produtoId} />
                <input type="hidden" name="quantidade" value="0" />
                <Botao type="submit" variante="link" disabled={alterando} aria-label={`Remover ${linha.nome} do carrinho`}>Remover</Botao>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
