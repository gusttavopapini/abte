"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { adicionarAoCarrinho } from "@/app/loja/acoes-carrinho";
import { Botao } from "@/components/Botao/Botao";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import estilos from "./AdicionarAoCarrinho.module.css";

// Botão "Adicionar ao carrinho" da página do produto (só para cliente logado
// e produto disponível). O servidor confere tudo de novo.
export function AdicionarAoCarrinho({ produtoId, maximo }: { produtoId: string; maximo: number }) {
  const [resposta, adicionar, adicionando] = useActionState(adicionarAoCarrinho, null);
  const id = useId();
  return (
    <form action={adicionar} className={estilos.formulario}>
      <input type="hidden" name="produtoId" value={produtoId} />
      {maximo > 1 ? (
        <div className={estilos.quantidade}>
          <label htmlFor={`${id}-quantidade`} className={estilos.rotulo}>Quantidade</label>
          <select id={`${id}-quantidade`} name="quantidade" defaultValue="1" className={estilos.selecao}>
            {Array.from({ length: maximo }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      ) : (
        <input type="hidden" name="quantidade" value="1" />
      )}
      <Botao type="submit" disabled={adicionando}>{adicionando ? "Adicionando…" : "Adicionar ao carrinho"}</Botao>
      {resposta && (
        <Mensagem tipo={resposta.ok ? "sucesso" : "erro"}>
          {resposta.mensagem} {resposta.ok && <Link href="/loja/carrinho">Ver carrinho</Link>}
        </Mensagem>
      )}
    </form>
  );
}
