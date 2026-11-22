"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Botao } from "@/components/Botao/Botao";
import { LIMITES_DAS_TAGS, normalizarTag } from "@/lib/profissionais";
import estilos from "./CampoDeTags.module.css";

type Props = {
  // Nome do campo enviado com o formulário (uma entrada por tag).
  name: string;
  rotulo: string;
  ajuda?: string;
  valoresIniciais: string[];
  // Sugestões do campo (lista do navegador); a digitação continua livre.
  sugestoes?: readonly string[];
  erro?: string;
  // Avisa a janela que houve alteração (os campos escondidos não disparam input).
  aoMudar?: () => void;
};

// Campo de tags livres (21/11/2026): digitar e apertar Enter, ou "Adicionar",
// cria uma etiqueta; o "x" de cada etiqueta a remove. Cada tag vai num campo
// escondido com o mesmo nome; a validação final é no servidor.
export function CampoDeTags({ name, rotulo, ajuda, valoresIniciais, sugestoes = [], erro, aoMudar }: Props) {
  const id = useId();
  const [tags, setTags] = useState<string[]>(valoresIniciais);
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState("");
  const [anuncio, setAnuncio] = useState("");
  const entradaRef = useRef<HTMLInputElement>(null);

  function adicionar() {
    const tag = normalizarTag(texto);
    if (!tag) return;
    if (tag.length > LIMITES_DAS_TAGS.tamanho) {
      setAviso(`Cada tag pode ter no máximo ${LIMITES_DAS_TAGS.tamanho} caracteres.`);
      return;
    }
    if (tags.some((atual) => atual.toLocaleLowerCase("pt-BR") === tag.toLocaleLowerCase("pt-BR"))) {
      setAviso(`A tag "${tag}" já está na lista.`);
      return;
    }
    if (tags.length >= LIMITES_DAS_TAGS.quantidade) {
      setAviso(`Use no máximo ${LIMITES_DAS_TAGS.quantidade} tags.`);
      return;
    }
    setTags([...tags, tag]);
    setTexto("");
    setAviso("");
    setAnuncio(`Tag ${tag} adicionada.`);
    aoMudar?.();
    entradaRef.current?.focus();
  }

  function remover(tag: string) {
    setTags(tags.filter((atual) => atual !== tag));
    setAviso("");
    setAnuncio(`Tag ${tag} removida.`);
    aoMudar?.();
    entradaRef.current?.focus();
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    // Enter adiciona a tag e não envia o formulário.
    if (evento.key === "Enter") {
      evento.preventDefault();
      adicionar();
    }
  }

  const mensagem = aviso || erro;
  const descritores = [ajuda ? `${id}-ajuda` : "", mensagem ? `${id}-erro` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div className={estilos.campo}>
      <label htmlFor={`${id}-entrada`} className={estilos.rotulo}>{rotulo}</label>
      {ajuda && <p id={`${id}-ajuda`} className={estilos.ajuda}>{ajuda}</p>}

      {tags.length > 0 && (
        <ul role="list" className={estilos.lista} aria-label={rotulo}>
          {tags.map((tag) => (
            <li key={tag} className={estilos.tag}>
              <span>{tag}</span>
              <button type="button" className={estilos.remover} onClick={() => remover(tag)} aria-label={`Remover a tag ${tag}`}>
                <span aria-hidden="true">×</span>
              </button>
              <input type="hidden" name={name} value={tag} />
            </li>
          ))}
        </ul>
      )}

      <div className={estilos.linha}>
        <input
          ref={entradaRef}
          id={`${id}-entrada`}
          type="text"
          className={estilos.entrada}
          value={texto}
          maxLength={LIMITES_DAS_TAGS.tamanho + 20}
          list={sugestoes.length > 0 ? `${id}-sugestoes` : undefined}
          onChange={(evento) => { setTexto(evento.target.value); setAviso(""); }}
          onKeyDown={aoTeclar}
          aria-invalid={mensagem ? true : undefined}
          aria-describedby={descritores}
          autoComplete="off"
        />
        <Botao type="button" variante="secundario" onClick={adicionar}>Adicionar</Botao>
      </div>
      {sugestoes.length > 0 && (
        <datalist id={`${id}-sugestoes`}>
          {sugestoes.filter((s) => !tags.includes(s)).map((s) => <option key={s} value={s} />)}
        </datalist>
      )}
      {mensagem && <p id={`${id}-erro`} className={estilos.erro}>{mensagem}</p>}
      <p className="somente-leitor" aria-live="polite">{anuncio}</p>
    </div>
  );
}
