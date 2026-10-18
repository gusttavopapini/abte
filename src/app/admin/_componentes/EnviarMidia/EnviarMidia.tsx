"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { enviarMidia, type RespostaDaMidia } from "@/app/admin/acoes-midia";
import { LIMITE_DO_ALT, MENSAGENS, validarAlt, validarAvisoDeMenor } from "@/lib/midia/regras";
import { reduzirImagem } from "./reduzirImagem";
import estilos from "./EnviarMidia.module.css";

type Erros = NonNullable<RespostaDaMidia["erros"]>;

// Textos do aviso de menores: PROVISÓRIOS. A redação final é da ABTE e da
// assessoria jurídica (pendência no CLAUDE.md).
const TEXTO_INDICA_MENOR = "A imagem mostra criança ou adolescente";
const TEXTO_AUTORIZACAO = "A ABTE tem autorização por escrito dos responsáveis";

type Props = {
  aoEnviar: (mensagem: string, id: string) => void;
  aoCancelar: () => void;
  // Rótulo acessível do grupo, quando o envio aparece dentro de outro formulário.
  rotulo?: string;
};

// Envio de imagem para a biblioteca: no modal de /admin/midia e dentro do
// seletor de mídia dos formulários. Não é um <form> e os campos não têm
// "name" nem "required": assim ele pode ficar dentro de outro formulário sem
// ir junto no envio dele nem travar esse envio. A imagem é reduzida no navegador e vai pela ação enviarMidia.
export function EnviarMidia({ aoEnviar, aoCancelar, rotulo }: Props) {
  const id = useId();
  const [erros, setErros] = useState<Erros>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [indicaMenor, setIndicaMenor] = useState(false);
  const [autorizacao, setAutorizacao] = useState(false);
  const resumoRef = useRef<HTMLDivElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const altRef = useRef<HTMLInputElement>(null);

  function mostrarErros(novos: Erros, texto: string) {
    setErros(novos);
    setMensagem(texto);
    requestAnimationFrame(() => resumoRef.current?.focus());
  }

  async function enviar() {
    if (enviando) return;
    const arquivo = arquivoRef.current?.files?.[0];
    const novos: Erros = {};
    if (!arquivo || arquivo.size === 0) novos.arquivo = MENSAGENS.semArquivo;
    const alt = validarAlt(altRef.current?.value);
    if (!alt.ok) novos.alt = alt.mensagem;
    const aviso = validarAvisoDeMenor(indicaMenor, autorizacao);
    if (aviso) novos.autorizacao = aviso;
    if (Object.keys(novos).length > 0 || !arquivo || !alt.ok) return mostrarErros(novos, "Confira os campos marcados.");

    setEnviando(true);
    try {
      const reduzida = await reduzirImagem(arquivo);
      if (!reduzida.ok) return mostrarErros({ arquivo: reduzida.mensagem }, reduzida.mensagem);
      const dados = new FormData();
      dados.set("arquivo", reduzida.arquivo);
      dados.set("alt", alt.alt);
      if (indicaMenor) dados.set("indicaMenor", "sim");
      if (indicaMenor && autorizacao) dados.set("autorizacao", "sim");
      const resposta = await enviarMidia(dados);
      if (resposta.ok && resposta.id) aoEnviar(resposta.mensagem, resposta.id);
      else mostrarErros(resposta.erros ?? {}, resposta.mensagem);
    } catch {
      mostrarErros({}, "Não foi possível enviar a imagem agora. Confira a conexão e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  // Enter no texto alternativo envia a imagem (e não o formulário de fora).
  function aoTeclarNoAlt(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key !== "Enter") return;
    evento.preventDefault();
    void enviar();
  }

  const descrito = (campo: keyof Erros) => (erros[campo] ? `${id}-${campo}-erro` : undefined);

  return (
    <div className={estilos.formulario} role="group" aria-label={rotulo}>
      {mensagem && <Mensagem tipo="erro" ref={resumoRef}>{mensagem}</Mensagem>}

      <div className={estilos.grupo}>
        <label htmlFor={`${id}-arquivo`} className={estilos.rotulo}>Imagem (JPEG, PNG ou WebP) <span aria-hidden="true">*</span></label>
        <input
          ref={arquivoRef}
          id={`${id}-arquivo`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-required="true"
          className={estilos.arquivo}
          aria-invalid={erros.arquivo ? true : undefined}
          aria-describedby={[`${id}-arquivo-ajuda`, descrito("arquivo")].filter(Boolean).join(" ")}
        />
        <p id={`${id}-arquivo-ajuda`} className={estilos.ajuda}>
          Antes do envio, a imagem é reduzida para até 2560 px no lado maior. O site guarda só cópias em WebP, sem os dados da câmera e de localização.
        </p>
        {erros.arquivo && <p id={`${id}-arquivo-erro`} className={estilos.erro}>{erros.arquivo}</p>}
      </div>

      <Campo
        ref={altRef}
        id={`${id}-alt`}
        rotulo={`Texto alternativo: descreva a imagem para quem não pode vê-la (até ${LIMITE_DO_ALT} caracteres)`}
        obrigatorio
        semValidacaoDoNavegador
        maxLength={LIMITE_DO_ALT}
        autoComplete="off"
        onKeyDown={aoTeclarNoAlt}
        erro={erros.alt}
      />

      <fieldset className={estilos.grupoSemMoldura} aria-describedby={descrito("autorizacao")}>
        <legend className={estilos.rotulo}>Pessoas na imagem</legend>
        <label className={estilos.opcao}>
          <input type="checkbox" checked={indicaMenor} onChange={(evento) => setIndicaMenor(evento.target.checked)} />
          {TEXTO_INDICA_MENOR}
        </label>
        {indicaMenor && (
          <label className={estilos.opcao}>
            <input type="checkbox" checked={autorizacao} onChange={(evento) => setAutorizacao(evento.target.checked)} aria-required="true" aria-invalid={erros.autorizacao ? true : undefined} />
            {TEXTO_AUTORIZACAO} <span aria-hidden="true">*</span>
          </label>
        )}
        {erros.autorizacao && <p id={`${id}-autorizacao-erro`} className={estilos.erro}>{erros.autorizacao}</p>}
      </fieldset>

      <div className={estilos.botoes}>
        <Botao type="button" variante="secundario" onClick={aoCancelar} disabled={enviando}>Cancelar</Botao>
        <Botao type="button" onClick={() => void enviar()} disabled={enviando}>{enviando ? "Enviando..." : "Enviar"}</Botao>
      </div>
    </div>
  );
}
