"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Botao } from "@/components/Botao/Botao";
import { Modal } from "@/components/Modal/Modal";
import estilos from "./AvisoDeAlteracoes.module.css";

// Aviso de alterações não salvas (29/10/2026): com o formulário alterado,
// fechar a aba pede confirmação ao navegador, e um link do painel abre uma
// janela "Sair sem salvar?" antes de trocar de página.
export function AvisoDeAlteracoes({ alterado }: { alterado: boolean }) {
  const router = useRouter();
  const [destino, setDestino] = useState<string | null>(null);

  useEffect(() => {
    if (!alterado) return;
    const aoSair = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
    };
    // Cliques em links da mesma origem (menu, trilha, "Voltar"): segura a
    // navegação e pergunta. Links para outra aba seguem normalmente.
    const aoClicar = (evento: MouseEvent) => {
      if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
      const link = (evento.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const endereco = new URL(link.href, window.location.href);
      if (endereco.origin !== window.location.origin || endereco.pathname === window.location.pathname) return;
      evento.preventDefault();
      evento.stopPropagation();
      setDestino(`${endereco.pathname}${endereco.search}${endereco.hash}`);
    };
    window.addEventListener("beforeunload", aoSair);
    document.addEventListener("click", aoClicar, true);
    return () => {
      window.removeEventListener("beforeunload", aoSair);
      document.removeEventListener("click", aoClicar, true);
    };
  }, [alterado]);

  return (
    <Modal aberto={destino !== null} aoFechar={() => setDestino(null)} titulo="Sair sem salvar?">
      <p className="tipo-texto">As alterações deste formulário ainda não foram salvas. Se sair agora, elas se perdem.</p>
      <div className={estilos.botoes}>
        <Botao type="button" variante="secundario" onClick={() => setDestino(null)}>
          Continuar editando
        </Botao>
        <Botao
          type="button"
          onClick={() => {
            const ir = destino;
            setDestino(null);
            if (ir) router.push(ir);
          }}
        >
          Sair sem salvar
        </Botao>
      </div>
    </Modal>
  );
}
