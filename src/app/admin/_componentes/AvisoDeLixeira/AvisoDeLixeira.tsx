"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { restaurarItemDaLixeira } from "@/app/admin/acoes-lixeira";
import { Botao } from "@/components/Botao/Botao";
import type { ColecaoDoPainel } from "@/lib/lixeira";
import { CaixaDoPainel } from "../CaixaDoPainel/CaixaDoPainel";
import estilos from "./AvisoDeLixeira.module.css";

// Aviso no formulário de um item que está na lixeira (04/11/2026): ele não
// aparece no site e só pode ser salvo como rascunho; publicar exige
// restaurar antes. O botão Restaurar faz isso sem sair da tela.
export function AvisoDeLixeira({ colecao, id }: { colecao: ColecaoDoPainel; id: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [restaurando, iniciar] = useTransition();

  function restaurar() {
    setErro(null);
    iniciar(async () => {
      try {
        const resposta = await restaurarItemDaLixeira(colecao, id);
        if (resposta.ok) router.refresh();
        else setErro(resposta.mensagem);
      } catch {
        setErro("Não foi possível restaurar agora. Tente de novo em instantes.");
      }
    });
  }

  return (
    <div className={estilos.aviso}>
      <CaixaDoPainel tipo="atencao" titulo="Este item está na lixeira">
        <p>Ele não aparece no site. Para publicar, restaure antes; enquanto isso, só é possível salvar como rascunho.</p>
        <div className={estilos.acao}>
          <Botao type="button" variante="secundario" onClick={restaurar} disabled={restaurando}>
            {restaurando ? "Restaurando..." : "Restaurar"}
          </Botao>
        </div>
      </CaixaDoPainel>
      {erro && (
        <CaixaDoPainel tipo="erro" anunciar>
          {erro}
        </CaixaDoPainel>
      )}
    </div>
  );
}
