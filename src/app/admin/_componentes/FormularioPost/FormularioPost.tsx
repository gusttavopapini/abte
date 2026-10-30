"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { AvisoDeAlteracoes } from "@/app/admin/_componentes/AvisoDeAlteracoes/AvisoDeAlteracoes";
import { BarraDeSalvar } from "@/app/admin/_componentes/BarraDeSalvar/BarraDeSalvar";
import { ContadorDeCaracteres } from "@/app/admin/_componentes/ContadorDeCaracteres/ContadorDeCaracteres";
import { SecaoDoFormulario } from "@/app/admin/_componentes/SecaoDoFormulario/SecaoDoFormulario";
import { Botao } from "@/components/Botao/Botao";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { ImagemDoItem, type EscolhaDeImagem } from "@/app/admin/_componentes/ImagemDoItem/ImagemDoItem";
import type { RespostaDoPost } from "@/app/admin/acoes-conteudo";
import type { Post } from "@/lib/dados/tipos";
import classes from "../estilosDoFormulario.module.css";

type OpcaoDeTopico = { id: string; nome: string };

// Mesmo limite da ação (acoes-conteudo.ts).
const LIMITE_DO_TITULO = 200;

type PropsFormularioPost = {
  acao: (anterior: RespostaDoPost, dados: FormData) => Promise<RespostaDoPost>;
  // Sem post: formulário de criação. Com post: edição, com os valores atuais.
  post?: Pick<Post, "id" | "titulo" | "imagem" | "conteudo" | "categoria" | "tags" | "formatoConteudo">;
  // Categorias (a inativa vem com "(inativa)" no nome) e tags fora da lixeira.
  categorias: OpcaoDeTopico[];
  tags: OpcaoDeTopico[];
  // Capa atual da biblioteca de mídia (imagem null: foi para a lixeira).
  capa: EscolhaDeImagem;
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
  // Imagem no texto (29/10/2026): com uma imagem inserida, o texto passa a
  // ser lido como Markdown restrito (os posts importados já são).
  const [emMarkdown, setEmMarkdown] = useState(post?.formatoConteudo === "markdown");
  const [inserindo, setInserindo] = useState(false);
  const [anuncioDoTexto, setAnuncioDoTexto] = useState("");
  const conteudoRef = useRef<HTMLTextAreaElement>(null);
  // Alterações não salvas: avisa antes de sair da página.
  const [alterado, setAlterado] = useState(false);

  // A imagem enviada entra no ponto do cursor, numa linha só dela.
  function inserirNoTexto(escolha: EscolhaDeImagem) {
    const campo = conteudoRef.current;
    if (!escolha || !campo) return;
    const alt = (escolha.imagem?.alt ?? "Imagem").replace(/[[\]]/g, "");
    const inicio = campo.selectionStart ?? campo.value.length;
    const antes = campo.value.slice(0, inicio);
    const separadorAntes = antes === "" || antes.endsWith("\n\n") ? "" : antes.endsWith("\n") ? "\n" : "\n\n";
    campo.setRangeText(`${separadorAntes}![${alt}](midia:${escolha.id})\n\n`, inicio, campo.selectionEnd ?? inicio, "end");
    setEmMarkdown(true);
    setInserindo(false);
    setAnuncioDoTexto("Imagem inserida no texto do post.");
    setAlterado(true);
    campo.focus();
  }

  useEffect(() => {
    if (resposta) resumoRef.current?.focus();
  }, [resposta]);

  // Envio sem o formulário se limpar: com erro, o que foi digitado continua.
  // O botão clicado (publicar ou rascunho) vai junto, como no envio comum.
  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const botao = (evento.nativeEvent as SubmitEvent).submitter;
    const dados = new FormData(evento.currentTarget, botao instanceof HTMLButtonElement ? botao : null);
    setAlterado(false);
    startTransition(() => enviar(dados));
  }

  return (
    <form onSubmit={aoEnviar} onInput={() => setAlterado(true)} className={classes.formulario}>
      {post && <input type="hidden" name="id" value={post.id} />}
      <AvisoDeAlteracoes alterado={alterado && !salvando} />

      {resposta && (
        <Mensagem tipo="erro" ref={resumoRef}>
          {resposta.mensagem}
        </Mensagem>
      )}

      <SecaoDoFormulario titulo="Texto do post" descricao="O título aparece no card do blog e no alto da página do post.">
        <div className={classes.grupo}>
          <label htmlFor="titulo" className={classes.rotulo}>
            Título <span aria-hidden="true">*</span>
          </label>
          <input
            type="text"
            id="titulo"
            name="titulo"
            defaultValue={post?.titulo}
            maxLength={LIMITE_DO_TITULO}
            className={classes.entrada}
            required
            aria-describedby="titulo-contador"
          />
          <ContadorDeCaracteres alvo="titulo" limite={LIMITE_DO_TITULO} />
        </div>

        <div className={classes.grupo}>
          <label htmlFor="conteudo" className={classes.rotulo}>
            Conteúdo <span aria-hidden="true">*</span>
          </label>
          {emMarkdown && <input type="hidden" name="formatoConteudo" value="markdown" />}
          <p id="conteudo-ajuda" className={classes.ajuda}>
            {emMarkdown
              ? "Texto em Markdown restrito: parágrafos separados por uma linha em branco, ## para subtítulo, **negrito**, *itálico*, listas com - e imagens como ![descrição](midia:id), que o botão abaixo insere."
              : "Parágrafos separados por uma linha em branco. Ao inserir uma imagem no texto, o post passa a usar Markdown restrito (**negrito**, *itálico*, ## para subtítulo)."}
          </p>
          <textarea ref={conteudoRef} id="conteudo" name="conteudo" defaultValue={post?.conteudo} rows={15} className={classes.areaDeTexto} required aria-describedby="conteudo-ajuda" />
          <div className={classes.botoes}>
            <Botao type="button" variante="secundario" onClick={() => setInserindo(!inserindo)} aria-expanded={inserindo} aria-controls="inserir-imagem-no-texto">
              {inserindo ? "Fechar envio de imagem" : "Inserir imagem no texto"}
            </Botao>
          </div>
          {inserindo && (
            <div id="inserir-imagem-no-texto">
              <ImagemDoItem
                rotulo="Imagem no texto do post"
                inicial={null}
                dono={{ tipo: "post", id: post?.id ?? null, campo: "corpo" }}
                proporcao="livre (aparece na largura do texto, com a proporção da própria imagem)"
                textoDoEnvio="Inserir no texto"
                soEnvio
                aoMudar={inserirNoTexto}
              />
            </div>
          )}
          <p className="somente-leitor" aria-live="polite">{anuncioDoTexto}</p>
        </div>
      </SecaoDoFormulario>

      <SecaoDoFormulario titulo="Capa">
        <ImagemDoItem
          nome="capaMidiaId"
          rotulo="Imagem de capa (opcional)"
          inicial={capa}
          dono={{ tipo: "post", id: post?.id ?? null, campo: "capa" }}
          proporcao="16:9 (a capa aparece assim na lista do blog)"
          erro={resposta?.erros?.capaMidiaId}
          aoMudar={(escolha) => {
            setTemCapa(escolha !== null);
            setAlterado(true);
          }}
        />
        {/* Capa antiga (endereço digitado antes da biblioteca): continua no site
            até haver uma capa da biblioteca. Só informada, não editável. */}
        {post?.imagem && !temCapa && (
          <p className={classes.ajuda}>
            Este post tem uma capa antiga, de endereço externo, que continua aparecendo no site até você escolher uma capa da biblioteca:{" "}
            <span className={classes.enderecoAntigo}>{post.imagem}</span>
          </p>
        )}
      </SecaoDoFormulario>

      <SecaoDoFormulario titulo="Classificação" descricao="Categoria e tags ajudam a filtrar o blog. As duas são opcionais.">
        <div className={classes.grupo}>
          <label htmlFor="categoria" className={classes.rotulo}>Categoria</label>
          <select id="categoria" name="categoria" defaultValue={post?.categoria ?? ""} className={classes.selecao} aria-describedby="categoria-ajuda" aria-invalid={resposta?.erros?.categoria ? true : undefined}>
            <option value="">Sem categoria</option>
            {categorias.map(({ id, nome }) => (
              <option key={id} value={id}>{nome}</option>
            ))}
          </select>
          <p id="categoria-ajuda" className={`${classes.ajuda} texto-corrido`}>
            {resposta?.erros?.categoria && <>{resposta.erros.categoria} </>}
            {categorias.length === 0 ? "Nenhuma categoria cadastrada ainda. " : "Para criar ou renomear categorias, use "}
            <Link href="/admin/blog/topicos">{categorias.length === 0 ? "Cadastre em Blog: categorias e tags" : "Blog: categorias e tags"}</Link>.
          </p>
        </div>

        <fieldset className={`${classes.grupo} ${classes.semMoldura}`}>
          <legend className={classes.rotulo}>Tags</legend>
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
      </SecaoDoFormulario>

      <BarraDeSalvar aviso={alterado ? "Há alterações não salvas." : "Publicar mostra o post no blog; rascunho o deixa só no painel."}>
        <Botao type="submit" name="acao" value="rascunho" variante="secundario" disabled={salvando}>{rotuloRascunho}</Botao>
        <Botao type="submit" name="acao" value="publicar" variante="primario" disabled={salvando}>{salvando ? "Salvando..." : rotuloPublicar}</Botao>
      </BarraDeSalvar>
    </form>
  );
}
