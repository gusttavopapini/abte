"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { adicionarAoCarrinho } from "@/app/loja/acoes-carrinho";
import { comprarAgora } from "@/app/loja/acoes-pedido";
import { Botao } from "@/components/Botao/Botao";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import estilos from "./AdicionarAoCarrinho.module.css";

// Caixa de compra da página do produto (produto disponível). Desde
// 08/11/2026 vale para todos, com ou sem conta: "Adicionar ao carrinho" e,
// com o pagamento ligado, "Comprar agora" (vai direto ao Checkout com este
// produto e a quantidade escolhida). O servidor confere tudo de novo.
export function AdicionarAoCarrinho({ produtoId, maximo, comprarAgoraLigado = false }: { produtoId: string; maximo: number; comprarAgoraLigado?: boolean }) {
  const [resposta, adicionar, adicionando] = useActionState(adicionarAoCarrinho, null);
  const [respostaDaCompra, comprar, comprando] = useActionState(comprarAgora, null);
  const id = useId();
  const ocupado = adicionando || comprando;
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
      {comprarAgoraLigado && (
        <Botao type="submit" formAction={comprar} disabled={ocupado} className={estilos.botao}>{comprando ? "Abrindo o pagamento…" : "Comprar agora"}</Botao>
      )}
      <Botao type="submit" variante={comprarAgoraLigado ? "secundario" : undefined} disabled={ocupado} className={estilos.botao}>{adicionando ? "Adicionando…" : "Adicionar ao carrinho"}</Botao>
      {respostaDaCompra && <Mensagem tipo="erro">{respostaDaCompra.mensagem}</Mensagem>}
      {resposta && (
        <Mensagem tipo={resposta.ok ? "sucesso" : "erro"}>
          {resposta.mensagem} {resposta.ok && <Link href="/loja/carrinho">Ver carrinho</Link>}
        </Mensagem>
      )}
    </form>
  );
}
