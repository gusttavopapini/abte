"use client";

import { useActionState } from "react";
import { finalizarCompra } from "@/app/loja/acoes-pedido";
import { Botao } from "@/components/Botao/Botao";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import estilos from "./FinalizarCompra.module.css";

// Botão "Finalizar compra" do carrinho (08/11/2026): envia para a ação de
// servidor, que leva ao Checkout da Stripe; erros em caixa branca.
export function FinalizarCompra({ desabilitado }: { desabilitado: boolean }) {
  const [resposta, finalizar, enviando] = useActionState(finalizarCompra, null);
  return (
    <form action={finalizar} className={estilos.formulario}>
      <Botao type="submit" disabled={desabilitado || enviando} className={estilos.botao}>
        {enviando ? "Abrindo o pagamento…" : "Finalizar compra"}
      </Botao>
      {resposta && <Mensagem tipo="erro">{resposta.mensagem}</Mensagem>}
    </form>
  );
}
