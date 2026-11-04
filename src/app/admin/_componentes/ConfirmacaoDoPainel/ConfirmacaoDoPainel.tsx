"use client";

import { type FormEvent, type ReactNode, useId, useState, useTransition } from "react";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Modal } from "@/components/Modal/Modal";
import { confirmacaoDeExclusaoValida, PALAVRA_DE_CONFIRMACAO } from "@/lib/lixeira";
import { CaixaDoPainel } from "../CaixaDoPainel/CaixaDoPainel";
import estilos from "./ConfirmacaoDoPainel.module.css";

export type RespostaDaConfirmacao = { ok: boolean; mensagem: string };

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  // Explicação curta do que vai acontecer.
  children: ReactNode;
  rotuloDoBotao: string;
  // Chamado com o texto digitado (só na confirmação reforçada). Resposta com
  // ok fecha a janela; com erro, a mensagem aparece numa caixa dentro dela.
  aoConfirmar: (confirmacao: string) => Promise<RespostaDaConfirmacao>;
  // Confirmação reforçada ("Excluir de vez", 04/11/2026): o que será perdido
  // e o nome do item, que vale como confirmação, além da palavra EXCLUIR.
  reforcada?: { nome: string; perdas: string[] };
};

// Janela de confirmação do painel (04/11/2026), no lugar do window.confirm:
// usa o Modal (foco preso, Esc fecha, foco volta a quem abriu). A
// confirmação reforçada só libera o botão com EXCLUIR ou o nome digitado; o
// servidor confere de novo.
export function ConfirmacaoDoPainel({ aberto, aoFechar, titulo, children, rotuloDoBotao, aoConfirmar, reforcada }: Props) {
  const idCampo = useId();
  const [digitado, setDigitado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const liberado = !reforcada || confirmacaoDeExclusaoValida(digitado, reforcada.nome);

  function fechar() {
    if (enviando) return;
    setDigitado("");
    setErro(null);
    aoFechar();
  }

  function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!liberado || enviando) return;
    setErro(null);
    iniciar(async () => {
      try {
        const resposta = await aoConfirmar(digitado);
        if (resposta.ok) fechar();
        else setErro(resposta.mensagem);
      } catch {
        setErro("Não foi possível concluir agora. Tente de novo em instantes.");
      }
    });
  }

  return (
    <Modal aberto={aberto} aoFechar={fechar} titulo={titulo}>
      <form className={estilos.formulario} onSubmit={confirmar}>
        <div className={estilos.texto}>{children}</div>
        {reforcada && (
          <>
            <CaixaDoPainel tipo="atencao" titulo="Esta ação não pode ser desfeita">
              <ul className={estilos.perdas}>
                {reforcada.perdas.map((perda) => (
                  <li key={perda}>{perda}</li>
                ))}
              </ul>
            </CaixaDoPainel>
            <Campo
              id={idCampo}
              rotulo={`Para confirmar, digite ${PALAVRA_DE_CONFIRMACAO} ou o nome do item`}
              autoComplete="off"
              spellCheck={false}
              value={digitado}
              onChange={(evento) => setDigitado(evento.target.value)}
            />
          </>
        )}
        {erro && (
          <CaixaDoPainel tipo="erro" anunciar>
            {erro}
          </CaixaDoPainel>
        )}
        <div className={estilos.botoes}>
          <Botao type="submit" disabled={!liberado || enviando}>
            {enviando ? "Aguarde..." : rotuloDoBotao}
          </Botao>
          <Botao type="button" variante="secundario" onClick={fechar} disabled={enviando}>
            Cancelar
          </Botao>
        </div>
      </form>
    </Modal>
  );
}
