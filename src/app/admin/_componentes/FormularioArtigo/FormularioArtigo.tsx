"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { Botao } from "@/components/Botao/Botao";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { SeletorDeMidia, type EscolhaDeMidia } from "@/app/admin/_componentes/SeletorDeMidia/SeletorDeMidia";
import type { RespostaDoArtigo } from "@/app/admin/acoes-conteudo";
import type { Artigo } from "@/lib/dados/tipos";
import {
  estiloAreaDeTexto,
  estiloEntrada,
  estiloFormulario,
  estiloRotulo,
  estiloSelecao,
} from "../estilosDoFormulario";
import classes from "../estilosDoFormulario.module.css";

// Categoria ou tag cadastrada em "Tópicos dos artigos".
type OpcaoDeTopico = { id: string; nome: string };

type PropsFormularioArtigo = {
  acao: (anterior: RespostaDoArtigo, dados: FormData) => Promise<RespostaDoArtigo>;
  // Sem artigo: formulário de criação. Com artigo: edição, com os valores atuais.
  artigo?: Pick<Artigo, "id" | "titulo" | "categoria" | "tags" | "autores" | "link" | "resumo">;
  // Tópicos fora da lixeira, lidos do Firestore pela página.
  categorias: OpcaoDeTopico[];
  tags: OpcaoDeTopico[];
  // Imagem atual da biblioteca de mídia (imagem null: foi para a lixeira).
  imagem: EscolhaDeMidia;
  rotuloPublicar: string;
  rotuloRascunho: string;
};

// Formulário de artigo científico, usado em "Adicionar Novo Artigo" e em "Editar Artigo".
// Erros voltam da ação em português, sem perder o que foi digitado.
export function FormularioArtigo({ acao, artigo, categorias, tags, imagem, rotuloPublicar, rotuloRascunho }: PropsFormularioArtigo) {
  const [resposta, enviar, salvando] = useActionState(acao, null);
  const resumoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resposta) resumoRef.current?.focus();
  }, [resposta]);

  // Envio sem o formulário se limpar: com erro, o que foi digitado continua.
  // O botão clicado (publicar ou rascunho) vai junto, como no envio comum.
  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const botao = (evento.nativeEvent as SubmitEvent).submitter;
    const dados = new FormData(evento.currentTarget, botao instanceof HTMLButtonElement ? botao : null);
    startTransition(() => enviar(dados));
  }

  return (
    <form onSubmit={aoEnviar} style={estiloFormulario}>
      {artigo && <input type="hidden" name="id" value={artigo.id} />}

      {resposta && (
        <Mensagem tipo="erro" ref={resumoRef}>
          {resposta.mensagem}
          {resposta.erros?.categoria && <> {resposta.erros.categoria}</>}
        </Mensagem>
      )}

      <div className={classes.grupo}>
        <label htmlFor="titulo" style={estiloRotulo}>Título do Artigo</label>
        <input
          type="text"
          id="titulo"
          name="titulo"
          defaultValue={artigo?.titulo}
          placeholder="Ex: The effect of bracing on scoliosis..."
          style={estiloEntrada}
          required
        />
      </div>

      <div className={classes.grupo}>
        <label htmlFor="categoria" style={estiloRotulo}>Categoria</label>
        <select id="categoria" name="categoria" defaultValue={artigo?.categoria} style={estiloSelecao} required aria-describedby="categoria-ajuda">
          <option value="">Selecione uma categoria...</option>
          {categorias.map(({ id, nome }) => (
            <option key={id} value={id}>{nome}</option>
          ))}
        </select>
        <p id="categoria-ajuda" className={classes.ajuda}>
          {categorias.length === 0 ? "Nenhuma categoria cadastrada ainda. " : "Para criar ou renomear categorias, use "}
          <Link href="/admin/artigos/topicos">{categorias.length === 0 ? "Cadastre em Tópicos dos artigos" : "Tópicos dos artigos"}</Link>.
        </p>
      </div>

      <fieldset className={`${classes.grupo} ${classes.semMoldura}`}>
        <legend style={estiloRotulo}>Tags (opcional)</legend>
        {tags.length === 0 ? (
          <p className={classes.ajuda}>Nenhuma tag cadastrada ainda.</p>
        ) : (
          <div className={classes.opcoes}>
            {tags.map(({ id, nome }) => (
              <label key={id} className={classes.opcao}>
                <input type="checkbox" name="tags" value={id} defaultChecked={artigo?.tags.includes(id)} />
                {nome}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className={classes.grupo}>
        <label htmlFor="autores" style={estiloRotulo}>Autores / Ano</label>
        <input
          type="text"
          id="autores"
          name="autores"
          defaultValue={artigo?.autores}
          placeholder="Ex: Negrini et al., 2018"
          style={estiloEntrada}
          required
        />
      </div>

      <div className={classes.grupo}>
        <label htmlFor="link" style={estiloRotulo}>Link do Estudo (URL)</label>
        <input
          type="text"
          id="link"
          name="link"
          defaultValue={artigo?.link}
          placeholder="https://pubmed.ncbi.nlm.nih.gov/..."
          style={estiloEntrada}
          required
        />
      </div>

      <div className={classes.grupo}>
        <SeletorDeMidia nome="imagemMidiaId" rotulo="Imagem do artigo (opcional, aparece na página do artigo)" inicial={imagem} erro={resposta?.erros?.imagemMidiaId} />
      </div>

      <div className={classes.grupo}>
        <label htmlFor="resumo" style={estiloRotulo}>Resumo ou Pontos Principais</label>
        <textarea
          id="resumo"
          name="resumo"
          defaultValue={artigo?.resumo}
          rows={10}
          placeholder="Descreva brevemente os achados do artigo..."
          style={estiloAreaDeTexto}
          required
        />
      </div>

      <div className={classes.botoes}>
        <Botao type="submit" name="acao" value="publicar" variante="primario" disabled={salvando}>{rotuloPublicar}</Botao>
        <Botao type="submit" name="acao" value="rascunho" variante="secundario" disabled={salvando}>{rotuloRascunho}</Botao>
      </div>
    </form>
  );
}
