"use client";

import { useActionState, useId } from "react";
import { aplicarCupom, removerCupom } from "@/app/loja/acoes-cupom";
import { Botao } from "@/components/Botao/Botao";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import estilos from "./CampoDeCupom.module.css";

// Cupom de desconto no carrinho (21/11/2026). Sem cupom: campo e "Aplicar".
// Com cupom: o código e "Remover". O servidor confere o código e recalcula o
// desconto no carrinho e ao finalizar a compra.
export function CampoDeCupom({ aplicado, invalido }: { aplicado: string | null; invalido: string | null }) {
  const [resposta, aplicar, aplicando] = useActionState(aplicarCupom, null);
  const [respostaRemover, remover, removendo] = useActionState(removerCupom, null);
  const id = useId();

  if (aplicado) {
    return (
      <form action={remover} className={estilos.aplicado}>
        <p>Cupom <strong>{aplicado}</strong> aplicado.</p>
        <Botao type="submit" variante="link" disabled={removendo} aria-label={`Remover o cupom ${aplicado}`}>Remover</Botao>
        {resposta?.ok && <p className="somente-leitor" aria-live="polite">{resposta.mensagem}</p>}
      </form>
    );
  }

  return (
    <form action={aplicar} className={estilos.formulario}>
      <label htmlFor={`${id}-codigo`} className={estilos.rotulo}>Cupom de desconto</label>
      <div className={estilos.linha}>
        <input id={`${id}-codigo`} name="codigo" autoComplete="off" autoCapitalize="characters" maxLength={20} className={estilos.entrada} />
        <Botao type="submit" variante="secundario" disabled={aplicando}>{aplicando ? "Aplicando…" : "Aplicar"}</Botao>
      </div>
      {invalido && !resposta && <Mensagem tipo="erro">O cupom {invalido} não é mais válido.</Mensagem>}
      {resposta && !resposta.ok && <Mensagem tipo="erro">{resposta.mensagem}</Mensagem>}
      {respostaRemover?.ok && !resposta && <p className="somente-leitor" aria-live="polite">{respostaRemover.mensagem}</p>}
    </form>
  );
}
