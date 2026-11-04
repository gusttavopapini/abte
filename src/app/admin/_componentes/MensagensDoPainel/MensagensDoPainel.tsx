"use client";

import Link from "next/link";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CaixaDoPainel } from "../CaixaDoPainel/CaixaDoPainel";
import estilos from "./MensagensDoPainel.module.css";

export type MensagemDoPainel = {
  tipo: "sucesso" | "erro";
  texto: string;
  avisos?: string[];
  link?: { href: string; rotulo: string };
  // Leva o foco para a mensagem (quando a linha que tinha o foco sumiu ou
  // mudou de lugar, ex.: foi para a lixeira).
  focar?: boolean;
};

type Avisar = (mensagem: MensagemDoPainel) => void;

const Contexto = createContext<Avisar | null>(null);

// Resultado das ações rápidas das listas (04/11/2026): uma caixa branca acima
// da lista, anunciada aos leitores de tela, com a última mensagem.
// inicial: mensagem já na chegada (ex.: "Produto salvo." depois do formulário).
export function MensagensDoPainel({ children, inicial }: { children: ReactNode; inicial?: MensagemDoPainel }) {
  const [atual, setAtual] = useState<(MensagemDoPainel & { chave: number }) | null>(inicial ? { ...inicial, chave: 0 } : null);
  const caixaRef = useRef<HTMLDivElement>(null);
  const avisar = useCallback<Avisar>((mensagem) => setAtual({ ...mensagem, chave: Date.now() }), []);

  useEffect(() => {
    if (atual?.focar) caixaRef.current?.focus({ preventScroll: false });
  }, [atual]);

  return (
    <Contexto.Provider value={avisar}>
      <div ref={caixaRef} tabIndex={-1} className={estilos.lugar}>
        {atual && (
          <CaixaDoPainel key={atual.chave} tipo={atual.tipo} anunciar>
            <p>{atual.texto}</p>
            {atual.avisos?.map((aviso) => <p key={aviso}>{aviso}</p>)}
            {atual.link && (
              <p>
                <Link href={atual.link.href} className="realce">{atual.link.rotulo}</Link>
              </p>
            )}
          </CaixaDoPainel>
        )}
      </div>
      {children}
    </Contexto.Provider>
  );
}

export function useAvisarNoPainel(): Avisar {
  const avisar = useContext(Contexto);
  if (!avisar) throw new Error("useAvisarNoPainel precisa estar dentro de MensagensDoPainel.");
  return avisar;
}
