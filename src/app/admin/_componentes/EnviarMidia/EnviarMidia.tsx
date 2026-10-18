"use client";

import { useId, useRef, useState, type FormEvent } from "react";
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

// Envio de imagem para a biblioteca, dentro do modal do painel. A imagem é
// reduzida no navegador e vai pela ação de servidor enviarMidia.
export function EnviarMidia({ aoEnviar, aoCancelar }: { aoEnviar: (mensagem: string) => void; aoCancelar: () => void }) {
  const id = useId();
  const [erros, setErros] = useState<Erros>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [indicaMenor, setIndicaMenor] = useState(false);
  const resumoRef = useRef<HTMLDivElement>(null);

  function mostrarErros(novos: Erros, texto: string) {
    setErros(novos);
    setMensagem(texto);
    requestAnimationFrame(() => resumoRef.current?.focus());
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const arquivo = formulario.get("arquivo");
    const novos: Erros = {};
    if (!(arquivo instanceof File) || arquivo.size === 0) novos.arquivo = MENSAGENS.semArquivo;
    const alt = validarAlt(formulario.get("alt"));
    if (!alt.ok) novos.alt = alt.mensagem;
    const aviso = validarAvisoDeMenor(formulario.get("indicaMenor") === "sim", formulario.get("autorizacao") === "sim");
    if (aviso) novos.autorizacao = aviso;
    if (Object.keys(novos).length > 0 || !(arquivo instanceof File)) return mostrarErros(novos, "Confira os campos marcados.");

    setEnviando(true);
    try {
      const reduzida = await reduzirImagem(arquivo);
      if (!reduzida.ok) return mostrarErros({ arquivo: reduzida.mensagem }, reduzida.mensagem);
      formulario.set("arquivo", reduzida.arquivo);
      const resposta = await enviarMidia(formulario);
      if (resposta.ok) aoEnviar(resposta.mensagem);
      else mostrarErros(resposta.erros ?? {}, resposta.mensagem);
    } catch {
      mostrarErros({}, "Não foi possível enviar a imagem agora. Confira a conexão e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  const descrito = (campo: keyof Erros) => (erros[campo] ? `${id}-${campo}-erro` : undefined);

  return (
    <form onSubmit={enviar} className={estilos.formulario} noValidate>
      {mensagem && <Mensagem tipo="erro" ref={resumoRef}>{mensagem}</Mensagem>}

      <div className={estilos.grupo}>
        <label htmlFor={`${id}-arquivo`} className={estilos.rotulo}>Imagem (JPEG, PNG ou WebP) <span aria-hidden="true">*</span></label>
        <input
          id={`${id}-arquivo`}
          name="arquivo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
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
        id={`${id}-alt`}
        name="alt"
        rotulo={`Texto alternativo: descreva a imagem para quem não pode vê-la (até ${LIMITE_DO_ALT} caracteres)`}
        obrigatorio
        maxLength={LIMITE_DO_ALT}
        autoComplete="off"
        erro={erros.alt}
      />

      <fieldset className={estilos.grupoSemMoldura} aria-describedby={descrito("autorizacao")}>
        <legend className={estilos.rotulo}>Pessoas na imagem</legend>
        <label className={estilos.opcao}>
          <input type="checkbox" name="indicaMenor" value="sim" checked={indicaMenor} onChange={(evento) => setIndicaMenor(evento.target.checked)} />
          {TEXTO_INDICA_MENOR}
        </label>
        {indicaMenor && (
          <label className={estilos.opcao}>
            <input type="checkbox" name="autorizacao" value="sim" required aria-invalid={erros.autorizacao ? true : undefined} />
            {TEXTO_AUTORIZACAO} <span aria-hidden="true">*</span>
          </label>
        )}
        {erros.autorizacao && <p id={`${id}-autorizacao-erro`} className={estilos.erro}>{erros.autorizacao}</p>}
      </fieldset>

      <div className={estilos.botoes}>
        <Botao type="button" variante="secundario" onClick={aoCancelar} disabled={enviando}>Cancelar</Botao>
        <Botao type="submit" disabled={enviando}>{enviando ? "Enviando..." : "Enviar"}</Botao>
      </div>
    </form>
  );
}
