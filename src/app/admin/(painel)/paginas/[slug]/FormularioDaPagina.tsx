"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { AvisoDeAlteracoes } from "@/app/admin/_componentes/AvisoDeAlteracoes/AvisoDeAlteracoes";
import { BarraDeSalvar } from "@/app/admin/_componentes/BarraDeSalvar/BarraDeSalvar";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { Interruptor } from "@/app/admin/_componentes/Interruptor/Interruptor";
import { salvarPagina } from "@/app/admin/acoes-paginas";
import { Botao } from "@/components/Botao/Botao";
import { MarkdownRestrito } from "@/components/MarkdownRestrito/MarkdownRestrito";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { LIMITE_DE_CARACTERES, lerMarkdownRestrito } from "@/lib/markdownRestrito";
import { LIMITE_DO_TITULO_DA_PAGINA, type PaginaInstitucional } from "@/lib/site/paginas";
import estilos from "../paginas.module.css";

// Formulário de uma página institucional (30/10/2026): título, texto em
// Markdown restrito (o mesmo dos posts), "Publicada" e a prévia montada pelo
// mesmo componente do site.
export function FormularioDaPagina({ pagina }: { pagina: PaginaInstitucional }) {
  const id = useId();
  const [resposta, salvar, salvando] = useActionState(salvarPagina, null);
  const [titulo, setTitulo] = useState(pagina.titulo);
  const [corpo, setCorpo] = useState(pagina.corpo);
  const [publicada, setPublicada] = useState(pagina.publicada);
  const [verPrevia, setVerPrevia] = useState(false);
  const [base, setBase] = useState({ titulo: pagina.titulo, corpo: pagina.corpo, publicada: pagina.publicada });
  const [enviado, setEnviado] = useState(base);
  const [respostaVista, setRespostaVista] = useState(resposta);
  const resultadoRef = useRef<HTMLDivElement>(null);

  if (resposta !== respostaVista) {
    setRespostaVista(resposta);
    if (resposta?.ok) setBase(enviado);
  }

  useEffect(() => {
    if (resposta) resultadoRef.current?.focus();
  }, [resposta]);

  const alterado = titulo !== base.titulo || corpo.trim() !== base.corpo.trim() || publicada !== base.publicada;
  const erros = resposta?.ok === false ? resposta.erros ?? {} : {};
  return (
    <form action={salvar} onSubmit={() => setEnviado({ titulo: titulo.trim(), corpo: corpo.trim(), publicada })} className={estilos.formulario}>
      <AvisoDeAlteracoes alterado={alterado && !salvando} />
      <input type="hidden" name="slug" value={pagina.slug} />
      {publicada && <input type="hidden" name="publicada" value="sim" />}
      <CaixaDoPainel tipo="atencao">O conteúdo jurídico deve ser fornecido e validado pela ABTE com assessoria jurídica. Este painel não gera texto legal.</CaixaDoPainel>

      <section className={estilos.secao} aria-labelledby={`${id}-texto`}>
        <h2 id={`${id}-texto`} className="tipo-texto-lg">Texto</h2>
        <div className={estilos.grupo}>
          <label htmlFor={`${id}-titulo`} className={estilos.rotulo}>Título</label>
          <input id={`${id}-titulo`} name="titulo" type="text" value={titulo} onChange={(evento) => setTitulo(evento.target.value)} maxLength={LIMITE_DO_TITULO_DA_PAGINA} required className={estilos.entrada} aria-invalid={erros.titulo ? true : undefined} aria-describedby={[`${id}-titulo-contador`, erros.titulo ? `${id}-titulo-erro` : ""].filter(Boolean).join(" ")} />
          <p id={`${id}-titulo-contador`} className={estilos.contador}>{titulo.length} de {LIMITE_DO_TITULO_DA_PAGINA} caracteres</p>
          {erros.titulo && <p id={`${id}-titulo-erro`} className={estilos.erro}>{erros.titulo}</p>}
        </div>
        <div className={estilos.grupo}>
          <label htmlFor={`${id}-corpo`} className={estilos.rotulo}>Texto da página</label>
          <p id={`${id}-corpo-ajuda`} className={estilos.ajuda}>
            O mesmo formato do texto dos posts: uma linha em branco separa os parágrafos; ## no começo da linha faz um título e ### um subtítulo; **negrito**, *itálico*, listas com - e links como [texto](https://endereco). HTML não é aceito. Vazio: publicada, a página mostra o texto preliminar do código.
          </p>
          <textarea id={`${id}-corpo`} name="corpo" value={corpo} onChange={(evento) => setCorpo(evento.target.value)} maxLength={LIMITE_DE_CARACTERES} className={`${estilos.entrada} ${estilos.corpo}`} aria-invalid={erros.corpo ? true : undefined} aria-describedby={[`${id}-corpo-ajuda`, erros.corpo ? `${id}-corpo-erro` : ""].filter(Boolean).join(" ")} />
          {erros.corpo && <p id={`${id}-corpo-erro`} className={estilos.erro}>{erros.corpo}</p>}
        </div>
        <div>
          <Botao type="button" variante="secundario" onClick={() => setVerPrevia(!verPrevia)} aria-expanded={verPrevia} aria-controls={`${id}-previa`}>
            {verPrevia ? "Esconder a pré-visualização" : "Pré-visualizar"}
          </Botao>
        </div>
        {verPrevia && (
          <div id={`${id}-previa`} className={`tipo-texto texto-corrido ${estilos.previa}`} aria-label="Pré-visualização do texto" role="region">
            {corpo.trim() ? <MarkdownRestrito blocos={lerMarkdownRestrito(corpo)} imagens={new Map()} sizes="824px" /> : <p>Sem texto: publicada, a página mostra o texto preliminar do código.</p>}
          </div>
        )}
      </section>

      <section className={estilos.secao} aria-labelledby={`${id}-publicacao`}>
        <h2 id={`${id}-publicacao`} className="tipo-texto-lg">Publicação</h2>
        <Interruptor id={`${id}-publicada`} rotulo="Publicada" ligado={publicada} aoMudar={setPublicada} descricao={`${id}-publicada-ajuda`} />
        <p id={`${id}-publicada-ajuda`} className={estilos.ajuda}>Publicada, a página abre no site e aparece no rodapé. Em rascunho, a página responde &quot;Página não encontrada&quot; e sai do rodapé.</p>
      </section>

      <div tabIndex={-1} ref={resultadoRef} aria-live="polite">
        {resposta && <Mensagem tipo={resposta.ok ? "sucesso" : "erro"}>{resposta.mensagem}</Mensagem>}
      </div>
      <BarraDeSalvar>
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : publicada ? "Salvar e publicar" : "Salvar como rascunho"}
        </Botao>
      </BarraDeSalvar>
    </form>
  );
}
