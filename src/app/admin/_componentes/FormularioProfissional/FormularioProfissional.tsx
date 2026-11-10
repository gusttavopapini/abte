"use client";

import { startTransition, useActionState, useEffect, useId, useRef, type FormEvent } from "react";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { ContadorDeCaracteres } from "@/app/admin/_componentes/ContadorDeCaracteres/ContadorDeCaracteres";
import { BarraDeSalvar } from "@/app/admin/_componentes/BarraDeSalvar/BarraDeSalvar";
import { SecaoDoFormulario } from "@/app/admin/_componentes/SecaoDoFormulario/SecaoDoFormulario";
import { ImagemDoItem } from "@/app/admin/_componentes/ImagemDoItem/ImagemDoItem";
import { salvarProfissional, type RespostaDoProfissional } from "@/app/admin/acoes-profissionais";
import { METODOS, PAISES, TAGS_DE_PROFISSIONAIS, UFS, rotuloDoTipo } from "@/config/profissionais";
import { LIMITE_DE_TELEFONES, outrosPerfisComoTexto } from "@/lib/contatos";
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
  // Avisa a janela que a foto mudou (escolha não passa por campo digitado).
  aoMudarFoto?: () => void;
};

// Erro de um campo que não usa o componente Campo (seleções e grupos).
function ErroDoCampo({ id, erro }: { id: string; erro?: string }) {
  if (!erro) return null;
  return <p id={id} className={estilos.erro}>{erro}</p>;
}

// Cadastro e edição de profissional, dentro do modal do painel.
export function FormularioProfissional({ profissional, aoSalvar, aoCancelar, aoMudarFoto }: Props) {
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
  // O botão usado decide a situação (06/11/2026, como no produto): "Salvar e
  // ativar" manda ativo=sim; "Salvar como oculto" não manda o campo. O campo
  // gravado continua o mesmo de quando era a caixa "Mostrar no site".
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const botao = (evento.nativeEvent as SubmitEvent).submitter;
    const dados = new FormData(evento.currentTarget, botao instanceof HTMLButtonElement ? botao : undefined);
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

      {/* Ordem antiga (10/11/2026): o site passou a ordenar por tipo e nome; o
          valor gravado continua o mesmo, sem campo na tela. */}
      <input type="hidden" name="ordem" value={p?.ordem ?? 0} />

      <p className={estilos.rotulo}>Campos com * são obrigatórios.</p>

      <SecaoDoFormulario titulo="Identificação" nivel={3} grade>
        <div className={estilos.grupo}>
          <label htmlFor={`${id}-tipo`} className={estilos.rotulo}>Tipo <span aria-hidden="true">*</span></label>
          <select id={`${id}-tipo`} name="tipo" required defaultValue={p?.tipo || TAGS_DE_PROFISSIONAIS[0]} className={estilos.selecao} aria-invalid={erros.tipo ? true : undefined} aria-describedby={descrito("tipo", !!erros.tipo)}>
            {TAGS_DE_PROFISSIONAIS.map((tipo) => <option key={tipo} value={tipo}>{rotuloDoTipo(tipo)}</option>)}
          </select>
          <ErroDoCampo id={`${id}-tipo-erro`} erro={erros.tipo} />
        </div>
        <div>
          <Campo id={`${id}-registro`} descritoPor={`${id}-registro-contador`} name="registro" rotulo="Registro profissional (ex.: Crefito, CRM, CRP)" maxLength={60} defaultValue={p?.registro} erro={erros.registro} />
          <ContadorDeCaracteres alvo={`${id}-registro`} limite={60} />
        </div>
        <div>
          <Campo id={`${id}-tratamento`} descritoPor={`${id}-tratamento-contador`} name="tratamento" rotulo="Tratamento (ex.: Dra., Dr., Ft.)" maxLength={20} defaultValue={p?.tratamento} erro={erros.tratamento} />
          <ContadorDeCaracteres alvo={`${id}-tratamento`} limite={20} />
        </div>
        <div>
          <Campo id={`${id}-nome`} descritoPor={`${id}-nome-contador`} name="nome" rotulo="Nome" obrigatorio maxLength={120} defaultValue={p?.nome} erro={erros.nome} />
          <ContadorDeCaracteres alvo={`${id}-nome`} limite={120} />
        </div>
      </SecaoDoFormulario>

      <SecaoDoFormulario titulo="Atuação" nivel={3} grade>
        <fieldset className={`${estilos.grupoSemMoldura} painel-inteira`} aria-describedby={descrito("metodos", !!erros.metodos)}>
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
        <div className="painel-inteira">
          <Campo id={`${id}-cidades`} name="cidades" rotulo="Cidades de atendimento (separe por vírgula)" multilinha defaultValue={p?.cidades.join(", ")} erro={erros.cidades ?? erros.local} />
        </div>
        <div className="painel-inteira">
          <div>
            <Campo id={`${id}-endereco`} descritoPor={`${id}-endereco-contador`} name="endereco" rotulo="Endereço do consultório (opcional)" maxLength={200} autoComplete="off" defaultValue={p?.endereco} erro={erros.endereco} />
            <ContadorDeCaracteres alvo={`${id}-endereco`} limite={200} />
          </div>
        </div>
        <label className={`${estilos.opcao} painel-inteira`}>
          <input type="checkbox" name="telerreabilitacao" value="sim" defaultChecked={p?.telerreabilitacao} />
          Atende por telerreabilitação
        </label>
      </SecaoDoFormulario>

      <SecaoDoFormulario titulo="Contatos" descricao="Preencha pelo menos um entre WhatsApp, telefone, Instagram, Facebook e e-mail." nivel={3} grade>
        <Campo id={`${id}-whatsapp`} name="whatsapp" rotulo="WhatsApp, com DDD" inputMode="tel" autoComplete="off" defaultValue={p?.whatsapp ? `+${p.whatsapp}` : ""} erro={erros.whatsapp} />
        <Campo
          id={`${id}-telefones`}
          name="telefones"
          rotulo={`Telefones, com DDD (até ${LIMITE_DE_TELEFONES}, um por linha)`}
          multilinha
          inputMode="tel"
          autoComplete="off"
          defaultValue={p?.telefones.map((telefone) => `+${telefone}`).join("\n")}
          erro={erros.telefones}
        />
        <Campo id={`${id}-instagram`} name="instagram" rotulo="Instagram (@usuario ou link do perfil)" autoComplete="off" defaultValue={p?.instagram ? `@${p.instagram}` : ""} erro={erros.instagram} />
        <Campo id={`${id}-facebook`} name="facebook" rotulo="Facebook (link do perfil ou da página)" inputMode="url" autoComplete="off" defaultValue={p?.facebook} erro={erros.facebook} />
        <Campo id={`${id}-email`} name="email" type="email" rotulo="E-mail" autoComplete="off" defaultValue={p?.email} erro={erros.email} />
        <Campo id={`${id}-site`} name="site" rotulo="Site (opcional, ex.: https://www.clinica.com.br)" inputMode="url" autoComplete="off" defaultValue={p?.site} erro={erros.site} />
        <div className="painel-inteira">
          <Campo
            id={`${id}-outros-perfis`}
            name="outrosPerfis"
            rotulo="Outros perfis (opcional, até 5, um por linha: Rótulo | link, ou @usuario do Instagram)"
            multilinha
            autoComplete="off"
            defaultValue={p ? outrosPerfisComoTexto(p.outrosPerfis) : ""}
            erro={erros.outrosPerfis}
          />
        </div>
        <div className="painel-inteira">
          <Campo id={`${id}-emails-extras`} name="emailsExtras" rotulo="E-mails extras (opcional, até 3, separe por vírgula; não aparecem no site)" multilinha autoComplete="off" defaultValue={p?.emailsExtras.join(", ")} erro={erros.emailsExtras} />
        </div>
      </SecaoDoFormulario>

      <SecaoDoFormulario titulo="Apresentação" nivel={3}>
        <div>
          <Campo id={`${id}-bio`} descritoPor={`${id}-bio-contador`} name="bio" rotulo="Apresentação (até 3.000 caracteres)" multilinha maxLength={3000} defaultValue={p?.bio} erro={erros.bio} />
          <ContadorDeCaracteres alvo={`${id}-bio`} limite={3000} />
        </div>
      </SecaoDoFormulario>

      <SecaoDoFormulario titulo="Foto" nivel={3}>
        <ImagemDoItem
          nome="fotoMidiaId"
          rotulo="Foto (aparece no card do site)"
          inicial={p?.fotoMidiaId ? { id: p.fotoMidiaId, imagem: p.foto } : null}
          dono={{ tipo: "profissional", id: p?.id ?? null, campo: "foto" }}
          proporcao="1:1, quadrada (o card mostra a foto alinhada ao alto)"
          erro={erros.fotoMidiaId}
          aoMudar={aoMudarFoto}
        />
      </SecaoDoFormulario>

      <BarraDeSalvar situacao={p ? (p.ativo ? "Ativo no site" : "Oculto") : "Ainda não salvo"} aviso="Ativar mostra o profissional no site; oculto o deixa fora dele.">
        <Botao type="button" variante="link" onClick={aoCancelar}>Cancelar</Botao>
        <Botao type="submit" variante="secundario" disabled={salvando}>Salvar como oculto</Botao>
        <Botao type="submit" name="ativo" value="sim" disabled={salvando}>{salvando ? "Salvando..." : "Salvar e ativar"}</Botao>
      </BarraDeSalvar>
    </form>
  );
}
