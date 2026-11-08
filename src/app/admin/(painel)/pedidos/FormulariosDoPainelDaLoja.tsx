"use client";

import { useActionState } from "react";
import { marcarEnvio, salvarFrete } from "@/app/admin/acoes-pedidos";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { Botao } from "@/components/Botao/Botao";
import estilos from "./pedidos.module.css";

// Botões de envio do pedido (só pedido pago).
export function AcoesDeEnvio({ pedidoId, situacao }: { pedidoId: string; situacao: "pendente" | "enviado" | "entregue" }) {
  const [resposta, enviar, salvando] = useActionState(marcarEnvio, null);
  return (
    <form action={enviar} className={estilos.acoes}>
      <input type="hidden" name="pedidoId" value={pedidoId} />
      <div className={estilos.botoes}>
        <Botao type="submit" name="situacao" value="enviado" disabled={salvando || situacao !== "pendente"}>Marcar como enviado</Botao>
        <Botao type="submit" name="situacao" value="entregue" variante="secundario" disabled={salvando || situacao === "entregue"}>Marcar como entregue</Botao>
      </div>
      {resposta && <CaixaDoPainel tipo={resposta.ok ? "informacao" : "erro"} anunciar>{resposta.mensagem}</CaixaDoPainel>}
    </form>
  );
}

// Frete fixo da loja, em reais.
export function FormularioDoFrete({ valorAtual }: { valorAtual: string }) {
  const [resposta, salvar, salvando] = useActionState(salvarFrete, null);
  return (
    <form action={salvar} className={estilos.formulario}>
      <label htmlFor="frete-fixo" className={estilos.rotulo}>Frete fixo (R$)</label>
      <input id="frete-fixo" name="frete" defaultValue={valorAtual} inputMode="decimal" autoComplete="off" className={estilos.entrada} aria-describedby="frete-ajuda" />
      <p id="frete-ajuda" className={estilos.ajuda}>
        Um valor por pedido, cobrado só quando há produto físico. Vazio: o pedido segue com frete 0 e mostra &ldquo;Frete combinado pela ABTE após a compra&rdquo;.
      </p>
      <Botao type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Salvar frete"}</Botao>
      {resposta && <CaixaDoPainel tipo={resposta.ok ? "informacao" : "erro"} anunciar>{resposta.mensagem}</CaixaDoPainel>}
    </form>
  );
}
