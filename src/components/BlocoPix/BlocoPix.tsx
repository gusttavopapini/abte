"use client";

import { useRef, useState } from "react";
import { Botao } from "@/components/Botao/Botao";
import estilos from "./BlocoPix.module.css";

type Props = { tipo: string; chaveExibida: string; chaveParaCopiar: string; favorecido: string; orientacao: string };

// Pix estático da página /doe (30/10/2026): tipo, chave (texto selecionável),
// favorecido e orientação, e o botão "Copiar chave". Sem QR Code e sem
// gateway. A cópia usa a Clipboard API e, sem ela (ou se falhar), seleciona
// a chave e usa o comando de copiar do navegador.
export function BlocoPix({ tipo, chaveExibida, chaveParaCopiar, favorecido, orientacao }: Props) {
  const [aviso, setAviso] = useState<string | null>(null);
  const chaveRef = useRef<HTMLParagraphElement>(null);

  function copiarPelaSelecao(): boolean {
    const area = document.createElement("textarea");
    area.value = chaveParaCopiar;
    area.setAttribute("readonly", "");
    area.className = estilos.areaDeCopia;
    document.body.appendChild(area);
    area.select();
    let copiou = false;
    try {
      copiou = document.execCommand("copy");
    } catch {
      copiou = false;
    }
    area.remove();
    return copiou;
  }

  async function copiar() {
    let copiou = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(chaveParaCopiar);
        copiou = true;
      }
    } catch {
      copiou = false;
    }
    if (!copiou) copiou = copiarPelaSelecao();
    if (!copiou && chaveRef.current) {
      // Último recurso: deixa a chave selecionada para copiar à mão.
      const intervalo = document.createRange();
      intervalo.selectNodeContents(chaveRef.current);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(intervalo);
    }
    setAviso(copiou ? "Chave copiada" : "Não foi possível copiar sozinho. A chave ficou selecionada: copie com o teclado ou com o menu do navegador.");
  }

  return (
    <section className={estilos.bloco} aria-labelledby="titulo-pix">
      <h2 id="titulo-pix" className="tipo-texto-lg">Doe por Pix</h2>
      <dl className={estilos.dados}>
        <div>
          <dt>Tipo da chave</dt>
          <dd>{tipo}</dd>
        </div>
        <div>
          <dt>Chave</dt>
          <dd>
            <p ref={chaveRef} className={estilos.chave}>
              {chaveExibida}
            </p>
          </dd>
        </div>
        {favorecido && (
          <div>
            <dt>Favorecido</dt>
            <dd>{favorecido}</dd>
          </div>
        )}
      </dl>
      {orientacao && <p className={estilos.orientacao}>{orientacao}</p>}
      <div className={estilos.acao}>
        <Botao type="button" onClick={() => void copiar()}>
          Copiar chave
        </Botao>
      </div>
      <div aria-live="polite" className={estilos.retorno}>
        {aviso && <p className={estilos.aviso}>{aviso}</p>}
      </div>
    </section>
  );
}
