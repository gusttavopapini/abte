"use client";

import { startTransition, useActionState, useEffect, useId, useRef, type FormEvent } from "react";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { ImagemDoItem } from "@/app/admin/_componentes/ImagemDoItem/ImagemDoItem";
import { salvarProfissional, type RespostaDoProfissional } from "@/app/admin/acoes-profissionais";
import { METODOS, PAISES, TAGS_DE_PROFISSIONAIS, UFS } from "@/config/profissionais";
import type { Profissional } from "@/lib/dados/tipos";
import type { ImagemNaTela } from "@/lib/midia/tela";
import estilos from "./FormularioProfissional.module.css";

// Profissional como a tela do painel recebe (sem datas). foto: a imagem de
// fotoMidiaId, ou null se não há foto ou ela está na lixeira da biblioteca.
export type ProfissionalNaTela = Omit<Profissional, "criadoEm" | "atualizadoEm" | "excluidoEm"> & { foto: ImagemNaTela | null };

type Props = {
  // Sem profissional: cadastro novo. Com profissional: edição.
  profissional: ProfissionalNaTela | null;
  aoSalvar: (mensagem: string) => void;
  aoCancelar: () => void;
};

// Erro de um campo que não usa o componente Campo (seleções e grupos).
function ErroDoCampo({ id, erro }: { id: string; erro?: string }) {
  if (!erro) return null;
  return <p id={id} className={estilos.erro}>{erro}</p>;
}

// Cadastro e edição de profissional, dentro do modal do painel.
export function FormularioProfissional({ profissional, aoSalvar, aoCancelar }: Props) {
  const [resposta, acao, salvando] = useActionState<RespostaDoProfissional | null, FormData>(salvarProfissional, null);
  const id = useId();
  const resumoRef = useRef<HTMLDivElement>(null);
  const erros = resposta?.ok === false ? resposta.erros ?? {} : {};
  const p = profissional;

  useEffect(() => {
    if (!resposta) return;
    if (resposta.ok) aoSalvar(resposta.mensagem);
    else resumoRef.current?.focus();
  }, [resposta, aoSalvar]);

  // Envio sem o formulário se limpar: com erro, o que foi digitado continua.
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => acao(dados));
  }

  const descrito = (campo: string, temErro: boolean) => (temErro ? `${id}-${campo}-erro` : undefined);

  return (
    <form onSubmit={enviar} className={estilos.formulario} noValidate>
      {p && <input type="hidden" name="id" value={p.id} />}

      {resposta?.ok === false && (
        <Mensagem tipo="erro" ref={resumoRef}>
          {resposta.mensagem}
          {erros.contatos && <> {erros.contatos}</>}
          {erros.local && <> {erros.local}</>}
        </Mensagem>
      )}

      <div className={estilos.grupo}>
        <label htmlFor={`${id}-tipo`} className={estilos.rotulo}>Tipo <span aria-hidden="true">*</span></label>
        <select id={`${id}-tipo`} name="tipo" required defaultValue={p?.tipo || TAGS_DE_PROFISSIONAIS[0]} className={estilos.selecao} aria-invalid={erros.tipo ? true : undefined} aria-describedby={descrito("tipo", !!erros.tipo)}>
          {TAGS_DE_PROFISSIONAIS.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
        </select>
        <ErroDoCampo id={`${id}-tipo-erro`} erro={erros.tipo} />
      </div>

      <div className={estilos.linha}>
        <Campo id={`${id}-tratamento`} name="tratamento" rotulo="Tratamento (ex.: Dra., Dr., Ft.)" maxLength={20} defaultValue={p?.tratamento} erro={erros.tratamento} />
        <Campo id={`${id}-nome`} name="nome" rotulo="Nome" obrigatorio maxLength={120} defaultValue={p?.nome} erro={erros.nome} />
      </div>

      <Campo id={`${id}-registro`} name="registro" rotulo="Registro profissional (ex.: Crefito, CRM, CRP)" maxLength={60} defaultValue={p?.registro} erro={erros.registro} />

      <fieldset className={estilos.grupoSemMoldura} aria-describedby={descrito("metodos", !!erros.metodos)}>
        <legend className={estilos.rotulo}>Métodos</legend>
        <div className={estilos.opcoes}>
          {METODOS.map((metodo) => (
            <label key={metodo} className={estilos.opcao}>
              <input type="checkbox" name="metodos" value={metodo} defaultChecked={p?.metodos.includes(metodo)} />
              {metodo}
            </label>
          ))}
        </div>
        <ErroDoCampo id={`${id}-metodos-erro`} erro={erros.metodos} />
      </fieldset>

      <div className={estilos.linha}>
        <div className={estilos.grupo}>
          <label htmlFor={`${id}-pais`} className={estilos.rotulo}>País <span aria-hidden="true">*</span></label>
          <select id={`${id}-pais`} name="pais" required defaultValue={p?.pais || "BR"} className={estilos.selecao} aria-invalid={erros.pais ? true : undefined} aria-describedby={descrito("pais", !!erros.pais)}>
            {PAISES.map(({ codigo, nome }) => <option key={codigo} value={codigo}>{nome}</option>)}
          </select>
          <ErroDoCampo id={`${id}-pais-erro`} erro={erros.pais} />
        </div>
        <div className={estilos.grupo}>
          <label htmlFor={`${id}-uf`} className={estilos.rotulo}>UF (só no Brasil)</label>
          <select id={`${id}-uf`} name="uf" defaultValue={p?.uf ?? ""} className={estilos.selecao} aria-invalid={erros.uf ? true : undefined} aria-describedby={descrito("uf", !!erros.uf)}>
            <option value="">Selecione...</option>
            {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
          <ErroDoCampo id={`${id}-uf-erro`} erro={erros.uf} />
        </div>
      </div>

      <Campo id={`${id}-cidades`} name="cidades" rotulo="Cidades de atendimento (separe por vírgula)" multilinha defaultValue={p?.cidades.join(", ")} erro={erros.cidades ?? erros.local} />

      <label className={estilos.opcao}>
        <input type="checkbox" name="telerreabilitacao" value="sim" defaultChecked={p?.telerreabilitacao} />
        Atende por telerreabilitação
      </label>

      <fieldset className={estilos.grupoSemMoldura}>
        <legend className={estilos.rotulo}>Contatos (pelo menos um)</legend>
        <div className={estilos.contatos}>
          <Campo id={`${id}-whatsapp`} name="whatsapp" rotulo="WhatsApp, com DDD" inputMode="tel" autoComplete="off" defaultValue={p?.whatsapp ? `+${p.whatsapp}` : ""} erro={erros.whatsapp} />
          <Campo id={`${id}-instagram`} name="instagram" rotulo="Instagram (@usuario ou link do perfil)" autoComplete="off" defaultValue={p?.instagram ? `@${p.instagram}` : ""} erro={erros.instagram} />
          <Campo id={`${id}-facebook`} name="facebook" rotulo="Facebook (link do perfil ou da página)" inputMode="url" autoComplete="off" defaultValue={p?.facebook} erro={erros.facebook} />
          <Campo id={`${id}-email`} name="email" type="email" rotulo="E-mail" autoComplete="off" defaultValue={p?.email} erro={erros.email} />
        </div>
      </fieldset>

      <Campo id={`${id}-bio`} name="bio" rotulo="Apresentação (até 1.000 caracteres)" multilinha maxLength={1000} defaultValue={p?.bio} erro={erros.bio} />

      <div className={estilos.linha}>
        <Campo id={`${id}-ordem`} name="ordem" type="number" min={0} max={999} rotulo="Ordem no site (menor aparece antes)" defaultValue={p?.ordem ?? 0} erro={erros.ordem} />
        <label className={`${estilos.opcao} ${estilos.alinharEmbaixo}`}>
          <input type="checkbox" name="ativo" value="sim" defaultChecked={p ? p.ativo : true} />
          Mostrar no site
        </label>
      </div>

      <ImagemDoItem
        nome="fotoMidiaId"
        rotulo="Foto (aparece no card do site)"
        inicial={p?.fotoMidiaId ? { id: p.fotoMidiaId, imagem: p.foto } : null}
        dono={{ tipo: "profissional", id: p?.id ?? null, campo: "foto" }}
        proporcao="1:1, quadrada (o card mostra a foto alinhada ao alto)"
        erro={erros.fotoMidiaId}
      />

      <div className={estilos.botoes}>
        <Botao type="button" variante="secundario" onClick={aoCancelar}>Cancelar</Botao>
        <Botao type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Botao>
      </div>
    </form>
  );
}
