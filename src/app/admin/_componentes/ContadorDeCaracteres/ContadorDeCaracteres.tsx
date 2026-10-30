"use client";

import { useEffect, useState } from "react";
import estilos from "./ContadorDeCaracteres.module.css";

// Contador "n de N caracteres" abaixo de um campo com limite (29/10/2026).
// Lê o campo pelo id (funciona com campos não controlados) e deve entrar no
// aria-describedby dele pelo próprio id (`${alvo}-contador`).
export function ContadorDeCaracteres({ alvo, limite }: { alvo: string; limite: number }) {
  const [quantidade, setQuantidade] = useState(0);
  useEffect(() => {
    const campo = document.getElementById(alvo);
    if (!(campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement)) return;
    const contar = () => setQuantidade(campo.value.length);
    contar();
    campo.addEventListener("input", contar);
    return () => campo.removeEventListener("input", contar);
  }, [alvo]);
  return (
    <p id={`${alvo}-contador`} className={`${estilos.contador} ${quantidade >= limite ? estilos.noLimite : ""}`}>
      {quantidade} de {limite} caracteres
    </p>
  );
}
