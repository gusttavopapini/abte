"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { adicionarAoCarrinho } from "@/app/loja/acoes-carrinho";
import { comprarAgora } from "@/app/loja/acoes-pedido";
import { Botao } from "@/components/Botao/Botao";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { ResumoDaCompra } from "../ResumoDaCompra/ResumoDaCompra";
import estilos from "./AdicionarAoCarrinho.module.css";

// Caixa de compra da página do produto (produto disponível). Desde
// 08/11/2026 vale para todos, com ou sem conta: "Adicionar ao carrinho" e,
// com o pagamento ligado, "Comprar agora" (vai direto ao Checkout com este
// produto e a quantidade escolhida). O servidor confere tudo de novo.
// Desde 08/11/2026 (noite), o resumo de subtotal, frete e total acompanha a
// quantidade; preço e frete chegam do servidor por props.
export function AdicionarAoCarrinho({
  produtoId,
  maximo,
  comprarAgoraLigado = false,
  precoUnitario,
  tipo,
  freteFixo,
}: {
  produtoId: string;
  maximo: number;
  comprarAgoraLigado?: boolean;
  precoUnitario: number;
  tipo: "fisico" | "digital";
  freteFixo: number | null;
}) {
  const [quantidade, setQuantidade] = useState(1);
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
          <select id={`${id}-quantidade`} name="quantidade" value={String(quantidade)} onChange={(evento) => setQuantidade(Number(evento.target.value))} className={estilos.selecao}>
            {Array.from({ length: maximo }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      ) : (
        <input type="hidden" name="quantidade" value="1" />
      )}
      <ResumoDaCompra precoUnitario={precoUnitario} quantidade={maximo > 1 ? quantidade : 1} tipo={tipo} freteFixo={freteFixo} />
      {comprarAgoraLigado && (
        <Botao type="submit" formAction={comprar} disabled={ocupado} className={estilos.botao}>{comprando ? "Abrindo o pagamento…" : "Comprar agora"}</Botao>
      )}
      <Botao type="submit" variante={comprarAgoraLigado ? "secundario" : undefined} disabled={ocupado} className={estilos.botao}>{adicionando ? "Adicionando…" : "Adicionar ao carrinho"}</Botao>
      {respostaDaCompra && <Mensagem tipo="erro">{respostaDaCompra.mensagem}</Mensagem>}
      {resposta && (
        <Mensagem tipo={resposta.ok ? "sucesso" : "erro"}>
          {resposta.mensagem} {resposta.ok && <Link href="/loja/carrinho" className="link-de-texto">Ver carrinho</Link>}
        </Mensagem>
      )}
    </form>
  );
}
