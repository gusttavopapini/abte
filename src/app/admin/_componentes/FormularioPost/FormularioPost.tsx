"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { Botao } from "@/components/Botao/Botao";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { SeletorDeMidia, type EscolhaDeMidia } from "@/app/admin/_componentes/SeletorDeMidia/SeletorDeMidia";
import type { RespostaDoPost } from "@/app/admin/acoes-conteudo";
import type { Post } from "@/lib/dados/tipos";
import {
  estiloAreaDeTexto,
  estiloEntrada,
  estiloFormulario,
  estiloRotulo,
  estiloSelecao,
} from "../estilosDoFormulario";
import classes from "../estilosDoFormulario.module.css";

type OpcaoDeTopico = { id: string; nome: string };

type PropsFormularioPost = {
  acao: (anterior: RespostaDoPost, dados: FormData) => Promise<RespostaDoPost>;
  // Sem post: formulário de criação. Com post: edição, com os valores atuais.
  post?: Pick<Post, "id" | "titulo" | "imagem" | "conteudo" | "categoria" | "tags">;
  // Categorias (a inativa vem com "(inativa)" no nome) e tags fora da lixeira.
  categorias: OpcaoDeTopico[];
  tags: OpcaoDeTopico[];
  // Capa atual da biblioteca de mídia (imagem null: foi para a lixeira).
  capa: EscolhaDeMidia;
  rotuloPublicar: string;
  rotuloRascunho: string;
};

// Formulário de post do blog, usado em "Adicionar Novo Post" e em "Editar Post".
// Erros voltam da ação em português, sem perder o que foi digitado.
export function FormularioPost({ acao, post, capa, categorias, tags, rotuloPublicar, rotuloRascunho }: PropsFormularioPost) {
  const [resposta, enviar, salvando] = useActionState(acao, null);
  const resumoRef = useRef<HTMLDivElement>(null);
  // Com uma capa da biblioteca escolhida, o aviso da capa antiga sai da tela.
  const [temCapa, setTemCapa] = useState(Boolean(capa));

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
      {post && <input type="hidden" name="id" value={post.id} />}

      {resposta && <Mensagem tipo="erro" ref={resumoRef}>{resposta.mensagem}</Mensagem>}

      <div className={classes.grupo}>
        <label htmlFor="titulo" style={estiloRotulo}>Título do Post</label>
        <input
          type="text"
          id="titulo"
          name="titulo"
          defaultValue={post?.titulo}
          placeholder="Ex: Novo tratamento para escoliose..."
          style={estiloEntrada}
          required
        />
      </div>

      <div className={classes.grupo}>
        <label htmlFor="categoria" style={estiloRotulo}>Categoria (opcional)</label>
        <select id="categoria" name="categoria" defaultValue={post?.categoria ?? ""} style={estiloSelecao} aria-describedby="categoria-ajuda">
          <option value="">Sem categoria</option>
          {categorias.map(({ id, nome }) => (
            <option key={id} value={id}>{nome}</option>
          ))}
        </select>
        <p id="categoria-ajuda" className={classes.ajuda}>
          {resposta?.erros?.categoria && <>{resposta.erros.categoria} </>}
          {categorias.length === 0 ? "Nenhuma categoria cadastrada ainda. " : "Para criar ou renomear categorias, use "}
          <Link href="/admin/blog/topicos">{categorias.length === 0 ? "Cadastre em Tópicos do blog" : "Tópicos do blog"}</Link>.
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
                <input type="checkbox" name="tags" value={id} defaultChecked={post?.tags.includes(id)} />
                {nome}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className={classes.grupo}>
        <SeletorDeMidia nome="capaMidiaId" rotulo="Imagem de capa" inicial={capa} erro={resposta?.erros?.capaMidiaId} aoMudar={(id) => setTemCapa(id !== null)} />
        {/* Capa antiga (endereço digitado antes da biblioteca): continua no site
            até haver uma capa da biblioteca. Só informada, não editável. */}
        {post?.imagem && !temCapa && (
          <p className={classes.ajuda}>
            Este post tem uma capa antiga, de endereço externo, que continua aparecendo no site até você escolher uma capa da biblioteca:{" "}
            <span className={classes.enderecoAntigo}>{post.imagem}</span>
          </p>
        )}
      </div>

      <div className={classes.grupo}>
        <label htmlFor="conteudo" style={estiloRotulo}>Conteúdo</label>
        <textarea
          id="conteudo"
          name="conteudo"
          defaultValue={post?.conteudo}
          rows={15}
          placeholder="Escreva o conteúdo do post aqui..."
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
