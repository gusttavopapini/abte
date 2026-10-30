"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { salvarDoacoesPorPix, salvarExibicaoDosArtigos } from "@/app/admin/acoes-configuracoes";
import {
  LIMITE_DA_ORIENTACAO,
  LIMITE_DO_FAVORECIDO,
  ROTULOS_DOS_TIPOS_DE_CHAVE,
  TIPOS_DE_CHAVE_PIX,
  type ChavePix,
  type TipoDeChavePix,
} from "@/lib/site/configuracoes";
import { Botao } from "@/components/Botao/Botao";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { Modal } from "@/components/Modal/Modal";
import { Interruptor } from "@/app/admin/_componentes/Interruptor/Interruptor";
import { IconeEngrenagem } from "@/components/Icones/Icones";
import estilos from "./ConfiguracoesDoSite.module.css";

// Caixa "Menu e rodapé": exibir ou não os Artigos no site. Desativar pede
// confirmação num Modal.
function CaixaDosArtigos({ inicial }: { inicial: boolean }) {
  const id = useId();
  const [resposta, salvar, salvando] = useActionState(salvarExibicaoDosArtigos, null);
  const [ativo, setAtivo] = useState(inicial);
  const [gravado, setGravado] = useState(inicial);
  const [confirmar, setConfirmar] = useState(false);
  const [enviado, setEnviado] = useState(inicial);
  const [respostaVista, setRespostaVista] = useState(resposta);
  const formulario = useRef<HTMLFormElement>(null);
  const resultadoRef = useRef<HTMLDivElement>(null);

  // Resposta nova: com sucesso, o valor enviado passa a ser o gravado
  // (ajuste durante a renderização, sem efeito).
  if (resposta !== respostaVista) {
    setRespostaVista(resposta);
    if (resposta?.ok) setGravado(enviado);
  }

  useEffect(() => {
    if (resposta) resultadoRef.current?.focus();
  }, [resposta]);

  function enviar() {
    if (!formulario.current) return;
    const dados = new FormData(formulario.current);
    setConfirmar(false);
    setEnviado(ativo);
    startTransition(() => salvar(dados));
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (gravado && !ativo) setConfirmar(true);
    else enviar();
  }

  return (
    <section className={estilos.caixa} aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} className="tipo-texto-lg">Menu e rodapé</h2>
      <form ref={formulario} onSubmit={aoEnviar} className={estilos.formulario}>
        <input type="hidden" name="artigosAtivo" value={ativo ? "sim" : "nao"} />
        <Interruptor id={`${id}-artigos`} rotulo="Exibir a página Artigos no site" ligado={ativo} aoMudar={setAtivo} descricao={`${id}-efeitos`} />
        <div id={`${id}-efeitos`}>
          <CaixaDoPainel tipo="informacao">
            Ativo: Artigos aparece no menu do cabeçalho, no menu de tela cheia e no rodapé. Inativo: some de todos os menus e a página deixa de existir para o público. O painel de Artigos continua funcionando, e nada é apagado.
          </CaixaDoPainel>
        </div>
        <div tabIndex={-1} ref={resultadoRef} aria-live="polite">
          {resposta && <Mensagem tipo={resposta.ok ? "sucesso" : "erro"}>{resposta.mensagem}</Mensagem>}
        </div>
        <div className={estilos.botoes}>
          <Botao type="button" variante="secundario" onClick={() => setAtivo(gravado)} disabled={salvando || ativo === gravado}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={salvando || ativo === gravado}>
            {salvando ? "Salvando..." : "Salvar"}
          </Botao>
        </div>
      </form>
      <Modal aberto={confirmar} aoFechar={() => setConfirmar(false)} titulo="Esconder os Artigos do site?">
        <div className={estilos.formulario}>
          <p className="tipo-texto">O item &quot;Artigos&quot; sai do menu e do rodapé e as páginas dos Artigos deixam de abrir para os visitantes. Dá para voltar a exibir a qualquer momento.</p>
          <div className={estilos.botoes}>
            <Botao type="button" variante="secundario" onClick={() => setConfirmar(false)}>
              Cancelar
            </Botao>
            <Botao type="button" onClick={enviar}>
              Esconder os Artigos
            </Botao>
          </div>
        </div>
      </Modal>
    </section>
  );
}

const AJUDA_DA_CHAVE: Record<TipoDeChavePix, string> = {
  cnpj: "14 números; pontos, barra e hífen são opcionais.",
  email: "O e-mail cadastrado como chave Pix no banco.",
  telefone: "Com DDD, sem o +55 (ex.: 11 91234 5678).",
  aleatoria: "A chave de 36 caracteres gerada pelo banco.",
};

// Caixa "Doações por Pix" (Pix estático da /doe). Chave nova ou alterada
// pede confirmação num Modal; chave vazia remove o Pix.
function CaixaDoPix({ inicial }: { inicial: ChavePix | null }) {
  const id = useId();
  const [resposta, salvar, salvando] = useActionState(salvarDoacoesPorPix, null);
  const [tipo, setTipo] = useState<TipoDeChavePix>(inicial?.tipo ?? "cnpj");
  const [chave, setChave] = useState(inicial?.chave ?? "");
  const [favorecido, setFavorecido] = useState(inicial?.favorecido ?? "");
  const [orientacao, setOrientacao] = useState(inicial?.orientacao ?? "");
  const [gravada, setGravada] = useState({ tipo: inicial?.tipo ?? null, chave: inicial?.chave ?? "", favorecido: inicial?.favorecido ?? "", orientacao: inicial?.orientacao ?? "" });
  const [enviada, setEnviada] = useState(gravada);
  const [respostaVista, setRespostaVista] = useState(resposta);
  const [confirmar, setConfirmar] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);
  const resultadoRef = useRef<HTMLDivElement>(null);

  if (resposta !== respostaVista) {
    setRespostaVista(resposta);
    if (resposta?.ok) setGravada(enviada);
  }

  useEffect(() => {
    if (resposta) resultadoRef.current?.focus();
  }, [resposta]);

  function enviar() {
    if (!formulario.current) return;
    const dados = new FormData(formulario.current);
    setConfirmar(false);
    setEnviada({ tipo, chave: chave.trim(), favorecido: favorecido.trim(), orientacao: orientacao.trim() });
    startTransition(() => salvar(dados));
  }

  // Cancelar: volta ao que está gravado.
  function descartar() {
    setTipo(gravada.tipo ?? "cnpj");
    setChave(gravada.chave);
    setFavorecido(gravada.favorecido);
    setOrientacao(gravada.orientacao);
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const chaveNova = chave.trim() !== "" && (chave.trim() !== gravada.chave || tipo !== gravada.tipo);
    if (chaveNova) setConfirmar(true);
    else enviar();
  }

  const erros = resposta?.ok === false ? resposta.erros ?? {} : {};
  const descrito = (campo: string, ...outros: string[]) => [...outros, erros[campo] ? `${id}-${campo}-erro` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <section className={estilos.caixa} aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} className="tipo-texto-lg">Doações por Pix</h2>
      <CaixaDoPainel tipo="atencao">Esta chave será exibida publicamente. Confirme com a ABTE antes de salvar.</CaixaDoPainel>
      <p className={estilos.ajuda}>Pix estático: a página &quot;Doe para a ABTE&quot; mostra a chave e o botão &quot;Copiar chave&quot;. Sem QR Code e sem registro de doações. Deixe a chave vazia para voltar ao texto provisório.</p>
      <form ref={formulario} onSubmit={aoEnviar} className={estilos.formulario} noValidate>
        <div className={estilos.grupo}>
          <label htmlFor={`${id}-tipo`} className={estilos.rotulo}>Tipo da chave</label>
          <select id={`${id}-tipo`} name="tipo" value={tipo} onChange={(evento) => setTipo(evento.target.value as TipoDeChavePix)} className={estilos.entrada} aria-invalid={erros.tipo ? true : undefined} aria-describedby={descrito("tipo")}>
            {TIPOS_DE_CHAVE_PIX.map((opcao) => (
              <option key={opcao} value={opcao}>
                {ROTULOS_DOS_TIPOS_DE_CHAVE[opcao]}
              </option>
            ))}
          </select>
          {erros.tipo && <p id={`${id}-tipo-erro`} className={estilos.erro}>{erros.tipo}</p>}
        </div>
        <div className={estilos.grupo}>
          <label htmlFor={`${id}-chave`} className={estilos.rotulo}>Chave</label>
          <p id={`${id}-chave-ajuda`} className={estilos.ajuda}>{AJUDA_DA_CHAVE[tipo]}</p>
          <input id={`${id}-chave`} name="chave" type="text" value={chave} onChange={(evento) => setChave(evento.target.value)} autoComplete="off" spellCheck={false} maxLength={100} className={estilos.entrada} aria-invalid={erros.chave ? true : undefined} aria-describedby={descrito("chave", `${id}-chave-ajuda`)} />
          {erros.chave && <p id={`${id}-chave-erro`} className={estilos.erro}>{erros.chave}</p>}
        </div>
        <div className={estilos.grupo}>
          <label htmlFor={`${id}-favorecido`} className={estilos.rotulo}>Nome do favorecido (opcional)</label>
          <input id={`${id}-favorecido`} name="favorecido" type="text" value={favorecido} onChange={(evento) => setFavorecido(evento.target.value)} maxLength={LIMITE_DO_FAVORECIDO} autoComplete="off" className={estilos.entrada} aria-invalid={erros.favorecido ? true : undefined} aria-describedby={descrito("favorecido", `${id}-favorecido-contador`)} />
          <p id={`${id}-favorecido-contador`} className={estilos.contador}>{favorecido.length} de {LIMITE_DO_FAVORECIDO} caracteres</p>
          {erros.favorecido && <p id={`${id}-favorecido-erro`} className={estilos.erro}>{erros.favorecido}</p>}
        </div>
        <div className={estilos.grupo}>
          <label htmlFor={`${id}-orientacao`} className={estilos.rotulo}>Orientação ao doador (opcional)</label>
          <textarea id={`${id}-orientacao`} name="orientacao" value={orientacao} onChange={(evento) => setOrientacao(evento.target.value)} maxLength={LIMITE_DA_ORIENTACAO} rows={3} className={estilos.entrada} aria-invalid={erros.orientacao ? true : undefined} aria-describedby={descrito("orientacao", `${id}-orientacao-contador`)} />
          <p id={`${id}-orientacao-contador`} className={estilos.contador}>{orientacao.length} de {LIMITE_DA_ORIENTACAO} caracteres</p>
          {erros.orientacao && <p id={`${id}-orientacao-erro`} className={estilos.erro}>{erros.orientacao}</p>}
        </div>
        <div tabIndex={-1} ref={resultadoRef} aria-live="polite">
          {resposta && <Mensagem tipo={resposta.ok ? "sucesso" : "erro"}>{resposta.mensagem}</Mensagem>}
        </div>
        <div className={estilos.botoes}>
          <Botao type="button" variante="secundario" onClick={descartar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Botao>
        </div>
      </form>
      <Modal aberto={confirmar} aoFechar={() => setConfirmar(false)} titulo="Publicar esta chave Pix?">
        <div className={estilos.formulario}>
          <p className="tipo-texto">A chave aparece na página &quot;Doe para a ABTE&quot; para qualquer visitante. Confirme que ela foi conferida com a ABTE.</p>
          <div className={estilos.botoes}>
            <Botao type="button" variante="secundario" onClick={() => setConfirmar(false)}>
              Cancelar
            </Botao>
            <Botao type="button" onClick={enviar}>
              Salvar a chave
            </Botao>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export type ConfiguracoesDoSiteNaTela = { artigosAtivo: boolean; pix: ChavePix | null };

// Formulário único das configurações do site (30/10/2026): as caixas "Menu e
// rodapé" e "Doações por Pix". Só administrador ("configuracoes.editar").
export function FormularioDasConfiguracoes({ configuracoes }: { configuracoes: ConfiguracoesDoSiteNaTela }) {
  return (
    <div className={estilos.pagina}>
      <CaixaDosArtigos inicial={configuracoes.artigosAtivo} />
      <CaixaDoPix inicial={configuracoes.pix} />
    </div>
  );
}

// Botão "Configurações do site" (engrenagem e texto) e o Modal com o
// formulário, em qualquer tela do painel (barra lateral e cabeçalho da
// gaveta). Fechar o Modal (x, Esc ou fundo) descarta o que não foi salvo.
export function BotaoDasConfiguracoes({ configuracoes, abrirAoCarregar = false, className }: { configuracoes: ConfiguracoesDoSiteNaTela; abrirAoCarregar?: boolean; className?: string }) {
  const [aberto, setAberto] = useState(abrirAoCarregar);
  return (
    <>
      <button type="button" className={`${estilos.botaoDasConfiguracoes} ${className ?? ""}`} onClick={() => setAberto(true)} aria-haspopup="dialog">
        <IconeEngrenagem className={estilos.icone} />
        Configurações do site
      </button>
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo="Configurações do site" largura="larga">
        {aberto && <FormularioDasConfiguracoes configuracoes={configuracoes} />}
      </Modal>
    </>
  );
}
