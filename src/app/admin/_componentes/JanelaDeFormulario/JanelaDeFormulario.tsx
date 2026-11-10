"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Botao } from "@/components/Botao/Botao";
import { Modal } from "@/components/Modal/Modal";
import { AvisoDeAlteracoes } from "@/app/admin/_componentes/AvisoDeAlteracoes/AvisoDeAlteracoes";
import estilos from "./JanelaDeFormulario.module.css";

// O que a janela entrega ao formulário de dentro: fechar com o aviso (para o
// botão Cancelar) e marcar uma alteração que não passa por um campo digitado
// (ex.: imagem escolhida na biblioteca).
export type ControleDaJanela = { fecharComAviso: () => void; marcarAlteracao: () => void };

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: (controle: ControleDaJanela) => ReactNode;
};

// Janela com formulário do painel (06/11/2026: cadastro de profissional,
// banner e imagens da home). Com alteração não salva, fechar pelo "x", pelo
// Esc, pelo clique fora ou pelo Cancelar pede confirmação numa janela do
// próprio painel, sem o alerta do navegador; fechar a aba continua com o
// aviso do navegador (AvisoDeAlteracoes), como nas páginas de formulário.
// A alteração é percebida por qualquer digitação ou troca nos campos (input e
// change sobem até aqui) e pelo marcarAlteracao.
// Desde 10/11/2026, sempre larga (até 1040px), com o corpo rolando e a barra
// de salvar no pé (Modal largura="formulario").
export function JanelaDeFormulario({ aberto, aoFechar, titulo, children }: Props) {
  const [alterado, setAlterado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  // Cada vez que a janela abre ou fecha (inclusive depois de salvar), começa
  // sem alterações.
  const [abertoAntes, setAbertoAntes] = useState(aberto);
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto);
    setAlterado(false);
    setConfirmando(false);
  }

  const fecharDeVez = useCallback(() => {
    setConfirmando(false);
    setAlterado(false);
    aoFechar();
  }, [aoFechar]);

  const fecharComAviso = useCallback(() => {
    if (alterado) setConfirmando(true);
    else fecharDeVez();
  }, [alterado, fecharDeVez]);

  const marcarAlteracao = useCallback(() => setAlterado(true), []);

  return (
    <Modal aberto={aberto} aoFechar={fecharComAviso} titulo={titulo} largura="formulario">
      <div className={estilos.corpo} onInput={marcarAlteracao} onChange={marcarAlteracao}>
        <AvisoDeAlteracoes alterado={aberto && alterado} />
        {children({ fecharComAviso, marcarAlteracao })}
      </div>
      <Modal aberto={aberto && confirmando} aoFechar={() => setConfirmando(false)} titulo="Descartar as alterações?">
        <p className="tipo-texto">As alterações desta janela ainda não foram salvas. Se fechar agora, elas se perdem.</p>
        <div className={estilos.botoes}>
          <Botao type="button" variante="secundario" onClick={() => setConfirmando(false)}>
            Continuar editando
          </Botao>
          <Botao type="button" onClick={fecharDeVez}>
            Descartar e fechar
          </Botao>
        </div>
      </Modal>
    </Modal>
  );
}
