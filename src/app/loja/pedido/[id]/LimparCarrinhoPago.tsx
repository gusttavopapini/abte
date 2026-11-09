"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { limparCarrinhoDoVisitantePago } from "@/app/loja/acoes-pedido";

// Pedido de visitante já pago (08/11/2026): pede ao servidor para apagar o
// carrinho guardado no cookie (o webhook não alcança o navegador). Não mostra
// nada; o servidor confere o token e a situação antes.
export function LimparCarrinhoPago({ pedidoId, token }: { pedidoId: string; token: string }) {
  const router = useRouter();
  useEffect(() => {
    limparCarrinhoDoVisitantePago(pedidoId, token)
      .then(() => router.refresh())
      .catch(() => {});
  }, [pedidoId, token, router]);
  return null;
}
