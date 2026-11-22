"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { criarCupomNoPainel, excluirCupomNoPainel, salvarCupomNoPainel } from "@/app/admin/acoes-cupons";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { ConfirmacaoDoPainel } from "@/app/admin/_componentes/ConfirmacaoDoPainel/ConfirmacaoDoPainel";
import { Botao } from "@/components/Botao/Botao";
import { Modal } from "@/components/Modal/Modal";
import { LIMITES_DO_CUPOM } from "@/lib/loja/cupons";
import estilos from "../pedidos/pedidos.module.css";
import estilosDoCupom from "./cupons.module.css";

const AJUDA_PERCENTUAL = `Número inteiro de ${LIMITES_DO_CUPOM.percentualMinimo} a ${LIMITES_DO_CUPOM.percentualMaximo}.`;

// Campo de percentual e caixa "Ativo", comuns ao cadastro e à edição.
function CamposDoCupom({ id, percentual, ativo, erro }: { id: string; percentual?: number; ativo: boolean; erro?: string }) {
  return (
    <>
      <label htmlFor={`${id}-percentual`} className={estilos.rotulo}>Desconto (%)</label>
      <input
        id={`${id}-percentual`}
        name="percentual"
        inputMode="numeric"
        defaultValue={percentual ?? ""}
        autoComplete="off"
        className={estilos.entrada}
        aria-invalid={erro ? true : undefined}
        aria-describedby={`${id}-percentual-ajuda${erro ? ` ${id}-percentual-erro` : ""}`}
      />
      <p id={`${id}-percentual-ajuda`} className={estilos.ajuda}>{AJUDA_PERCENTUAL}</p>
      {erro && <p id={`${id}-percentual-erro`} className={estilosDoCupom.erro}>{erro}</p>}
      <label className={estilosDoCupom.opcao}>
        <input type="checkbox" name="ativo" value="sim" defaultChecked={ativo} />
        Ativo (pode ser usado no carrinho)
      </label>
    </>
  );
}

export function FormularioNovoCupom() {
  const [resposta, criar, salvando] = useActionState(criarCupomNoPainel, null);
  const id = useId();
  const formularioRef = useRef<HTMLFormElement>(null);
  const erros = resposta?.ok === false ? resposta.erros ?? {} : {};

  useEffect(() => {
    if (resposta?.ok) formularioRef.current?.reset();
  }, [resposta]);

  return (
    <form ref={formularioRef} action={criar} className={estilos.formulario} noValidate>
      <label htmlFor={`${id}-codigo`} className={estilos.rotulo}>Código</label>
      <input
        id={`${id}-codigo`}
        name="codigo"
        autoComplete="off"
        maxLength={LIMITES_DO_CUPOM.codigoMaximo}
        className={`${estilos.entrada} ${estilosDoCupom.codigo}`}
        aria-invalid={erros.codigo ? true : undefined}
        aria-describedby={`${id}-codigo-ajuda${erros.codigo ? ` ${id}-codigo-erro` : ""}`}
      />
      <p id={`${id}-codigo-ajuda`} className={estilos.ajuda}>Exemplo: ABTE10. Letras sem acento, números, hífen ou sublinhado; fica em maiúsculas.</p>
      {erros.codigo && <p id={`${id}-codigo-erro`} className={estilosDoCupom.erro}>{erros.codigo}</p>}
      <CamposDoCupom id={id} ativo erro={erros.percentual} />
      <Botao type="submit" disabled={salvando}>{salvando ? "Criando…" : "Criar cupom"}</Botao>
      {resposta && <CaixaDoPainel tipo={resposta.ok ? "informacao" : "erro"} anunciar>{resposta.mensagem}</CaixaDoPainel>}
    </form>
  );
}

function EdicaoDoCupom({ codigo, percentual, ativo, aoSalvar }: { codigo: string; percentual: number; ativo: boolean; aoSalvar: () => void }) {
  const [resposta, salvar, salvando] = useActionState(salvarCupomNoPainel, null);
  const id = useId();
  const erros = resposta?.ok === false ? resposta.erros ?? {} : {};
  useEffect(() => {
    if (resposta?.ok) aoSalvar();
  }, [resposta, aoSalvar]);
  return (
    <form action={salvar} className={estilos.formulario} noValidate>
      <input type="hidden" name="codigo" value={codigo} />
      <CamposDoCupom id={id} percentual={percentual} ativo={ativo} erro={erros.percentual} />
      <Botao type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Salvar cupom"}</Botao>
      {resposta && !resposta.ok && <CaixaDoPainel tipo="erro" anunciar>{resposta.mensagem}</CaixaDoPainel>}
    </form>
  );
}

// Editar (percentual e situação) e excluir, na linha da tabela.
export function AcoesDoCupom({ codigo, percentual, ativo }: { codigo: string; percentual: number; ativo: boolean }) {
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  return (
    <div className={estilos.botoes}>
      <Botao type="button" variante="secundario" onClick={() => setEditando(true)} aria-label={`Editar o cupom ${codigo}`}>Editar</Botao>
      <Botao type="button" variante="perigo" onClick={() => setExcluindo(true)} aria-label={`Excluir o cupom ${codigo}`}>Excluir</Botao>
      <Modal aberto={editando} aoFechar={() => setEditando(false)} titulo={`Editar o cupom ${codigo}`}>
        <EdicaoDoCupom codigo={codigo} percentual={percentual} ativo={ativo} aoSalvar={() => setEditando(false)} />
      </Modal>
      <ConfirmacaoDoPainel
        aberto={excluindo}
        aoFechar={() => setExcluindo(false)}
        titulo={`Excluir o cupom ${codigo}?`}
        rotuloDoBotao="Excluir cupom"
        perigo
        aoConfirmar={() => excluirCupomNoPainel(codigo)}
      >
        <p className="tipo-texto">O código deixa de funcionar no carrinho. Pedidos já feitos continuam mostrando o desconto que tiveram. Para pausar sem apagar, edite e desmarque &ldquo;Ativo&rdquo;.</p>
      </ConfirmacaoDoPainel>
    </div>
  );
}
