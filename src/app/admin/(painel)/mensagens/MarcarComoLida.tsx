"use client";

import { useActionState } from "react";
import { Botao } from "@/components/Botao/Botao";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { marcarComoLida, type RespostaDaMensagem } from "@/app/admin/acoes-mensagens";

// Botão "Marcar como lida" (08/11/2026), com a resposta em caixa branca.
export function MarcarComoLida({ id }: { id: string }) {
  const [resposta, acao, pendente] = useActionState<RespostaDaMensagem, FormData>(marcarComoLida, null);
  return (
    <form action={acao}>
      <input type="hidden" name="id" value={id} />
      {resposta && (
        <CaixaDoPainel tipo={resposta.ok ? "sucesso" : "erro"} anunciar>
          {resposta.mensagem}
        </CaixaDoPainel>
      )}
      {!resposta?.ok && (
        <Botao type="submit" aria-disabled={pendente || undefined}>
          {pendente ? "Marcando..." : "Marcar como lida"}
        </Botao>
      )}
    </form>
  );
}
