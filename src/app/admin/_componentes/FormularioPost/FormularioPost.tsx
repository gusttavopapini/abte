"use client";

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
} from "../estilosDoFormulario";
import classes from "../estilosDoFormulario.module.css";

type PropsFormularioPost = {
  acao: (anterior: RespostaDoPost, dados: FormData) => Promise<RespostaDoPost>;
  // Sem post: formulário de criação. Com post: edição, com os valores atuais.
  post?: Pick<Post, "id" | "titulo" | "imagem" | "conteudo">;
  // Capa atual da biblioteca de mídia (imagem null: foi para a lixeira).
  capa: EscolhaDeMidia;
  rotuloPublicar: string;
  rotuloRascunho: string;
};

// Formulário de post do blog, usado em "Adicionar Novo Post" e em "Editar Post".
// Erros voltam da ação em português, sem perder o que foi digitado.
export function FormularioPost({ acao, post, capa, rotuloPublicar, rotuloRascunho }: PropsFormularioPost) {
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
