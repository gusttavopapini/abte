"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { AvisoDeAlteracoes } from "@/app/admin/_componentes/AvisoDeAlteracoes/AvisoDeAlteracoes";
import { BarraDeSalvar } from "@/app/admin/_componentes/BarraDeSalvar/BarraDeSalvar";
import { ContadorDeCaracteres } from "@/app/admin/_componentes/ContadorDeCaracteres/ContadorDeCaracteres";
import { ImagemDoItem, type EscolhaDeImagem } from "@/app/admin/_componentes/ImagemDoItem/ImagemDoItem";
import { SecaoDoFormulario } from "@/app/admin/_componentes/SecaoDoFormulario/SecaoDoFormulario";
import type { RespostaDoArtigo } from "@/app/admin/acoes-conteudo";
import { Botao } from "@/components/Botao/Botao";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import type { Artigo } from "@/lib/dados/tipos";
import classes from "../estilosDoFormulario.module.css";

// Categoria ou tag cadastrada em "Artigos: categorias e tags".
type OpcaoDeTopico = { id: string; nome: string };

// Mesmos limites da ação (acoes-conteudo.ts).
const LIMITE_DO_TITULO = 300;
const LIMITE_DOS_AUTORES = 300;
const LIMITE_DO_LINK = 2048;

type PropsFormularioArtigo = {
  acao: (anterior: RespostaDoArtigo, dados: FormData) => Promise<RespostaDoArtigo>;
  // Sem artigo: formulário de criação. Com artigo: edição, com os valores atuais.
  artigo?: Pick<Artigo, "id" | "titulo" | "categoria" | "tags" | "autores" | "link" | "resumo">;
  // Tópicos fora da lixeira, lidos do Firestore pela página.
  categorias: OpcaoDeTopico[];
  tags: OpcaoDeTopico[];
  // Imagem atual da biblioteca de mídia (imagem null: foi para a lixeira).
  imagem: EscolhaDeImagem;
  rotuloPublicar: string;
  rotuloRascunho: string;
};

// Formulário de artigo científico (criar e editar), em seções; erros voltam
// da ação em português, sem perder o que foi digitado (29/10/2026: seções,
// contadores, barra de salvar e aviso de alterações não salvas).
export function FormularioArtigo({ acao, artigo, categorias, tags, imagem, rotuloPublicar, rotuloRascunho }: PropsFormularioArtigo) {
  const [resposta, enviar, salvando] = useActionState(acao, null);
  const resumoRef = useRef<HTMLDivElement>(null);
  const [alterado, setAlterado] = useState(false);

  useEffect(() => {
    if (resposta) resumoRef.current?.focus();
  }, [resposta]);

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
      {artigo && <input type="hidden" name="id" value={artigo.id} />}
      <AvisoDeAlteracoes alterado={alterado && !salvando} />

      {resposta && (
        <Mensagem tipo="erro" ref={resumoRef}>
          {resposta.mensagem}
          {resposta.erros?.categoria && <> {resposta.erros.categoria}</>}
        </Mensagem>
      )}

      <SecaoDoFormulario titulo="Dados do artigo" descricao="Título, autores e o link do estudo aparecem no card e na página do artigo.">
        <div className={classes.grupo}>
          <label htmlFor="titulo" className={classes.rotulo}>
            Título <span aria-hidden="true">*</span>
          </label>
          <input type="text" id="titulo" name="titulo" defaultValue={artigo?.titulo} maxLength={LIMITE_DO_TITULO} className={classes.entrada} required aria-describedby="titulo-contador" />
          <ContadorDeCaracteres alvo="titulo" limite={LIMITE_DO_TITULO} />
        </div>

        <div className={classes.grupo}>
          <label htmlFor="autores" className={classes.rotulo}>
            Autores e ano <span aria-hidden="true">*</span>
          </label>
          <p id="autores-ajuda" className={classes.ajuda}>Como aparece no card, por exemplo: Negrini et al., 2018.</p>
          <input type="text" id="autores" name="autores" defaultValue={artigo?.autores} maxLength={LIMITE_DOS_AUTORES} className={classes.entrada} required aria-describedby="autores-ajuda autores-contador" />
          <ContadorDeCaracteres alvo="autores" limite={LIMITE_DOS_AUTORES} />
        </div>

        <div className={classes.grupo}>
          <label htmlFor="link" className={classes.rotulo}>
            Link do estudo <span aria-hidden="true">*</span>
          </label>
          <p id="link-ajuda" className={classes.ajuda}>Endereço completo, começando com https:// (ex.: a página do estudo no PubMed).</p>
          <input type="text" id="link" name="link" inputMode="url" defaultValue={artigo?.link} maxLength={LIMITE_DO_LINK} className={classes.entrada} required aria-describedby="link-ajuda" spellCheck={false} />
        </div>

        <div className={classes.grupo}>
          <label htmlFor="resumo" className={classes.rotulo}>
            Resumo ou pontos principais <span aria-hidden="true">*</span>
          </label>
          <p id="resumo-ajuda" className={classes.ajuda}>Um parágrafo curto com os achados do estudo; aparece no card e na página.</p>
          <textarea id="resumo" name="resumo" defaultValue={artigo?.resumo} rows={10} className={classes.areaDeTexto} required aria-describedby="resumo-ajuda" />
        </div>
      </SecaoDoFormulario>

      <SecaoDoFormulario titulo="Imagem">
        <ImagemDoItem
          nome="imagemMidiaId"
          rotulo="Imagem do artigo (opcional)"
          inicial={imagem}
          dono={{ tipo: "artigo", id: artigo?.id ?? null, campo: "imagem" }}
          proporcao="16:9 (aparece assim no card e no alto da página do artigo)"
          erro={resposta?.erros?.imagemMidiaId}
          aoMudar={() => setAlterado(true)}
        />
      </SecaoDoFormulario>

      <SecaoDoFormulario titulo="Classificação" descricao="A categoria é obrigatória e define onde o artigo aparece em /artigos; as tags são opcionais.">
        <div className={classes.grupo}>
          <label htmlFor="categoria" className={classes.rotulo}>
            Categoria <span aria-hidden="true">*</span>
          </label>
          <select id="categoria" name="categoria" defaultValue={artigo?.categoria} className={classes.selecao} required aria-describedby="categoria-ajuda" aria-invalid={resposta?.erros?.categoria ? true : undefined}>
            <option value="">Selecione uma categoria...</option>
            {categorias.map(({ id, nome }) => (
              <option key={id} value={id}>{nome}</option>
            ))}
          </select>
          <p id="categoria-ajuda" className={`${classes.ajuda} texto-corrido`}>
            {categorias.length === 0 ? "Nenhuma categoria cadastrada ainda. " : "Para criar ou renomear categorias, use "}
            <Link href="/admin/artigos/topicos">{categorias.length === 0 ? "Cadastre em Artigos: categorias e tags" : "Artigos: categorias e tags"}</Link>.
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
                  <input type="checkbox" name="tags" value={id} defaultChecked={artigo?.tags.includes(id)} />
                  {nome}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </SecaoDoFormulario>

      <BarraDeSalvar aviso={alterado ? "Há alterações não salvas." : "Publicar mostra o artigo em /artigos; rascunho o deixa só no painel."}>
        <Botao type="submit" name="acao" value="rascunho" variante="secundario" disabled={salvando}>{rotuloRascunho}</Botao>
        <Botao type="submit" name="acao" value="publicar" variante="primario" disabled={salvando}>{salvando ? "Salvando..." : rotuloPublicar}</Botao>
      </BarraDeSalvar>
    </form>
  );
}
