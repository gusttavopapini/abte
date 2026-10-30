"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CabecalhoDoPainel, type PassoDaTrilha } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { salvarExibicaoDosArtigos } from "@/app/admin/acoes-configuracoes";
import { Botao } from "@/components/Botao/Botao";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { Modal } from "@/components/Modal/Modal";
import estilos from "./ConfiguracoesClient.module.css";

// Interruptor acessível (role="switch"), com o estado escrito ao lado.
export function Interruptor({ id, rotulo, ligado, aoMudar, descricao }: { id: string; rotulo: string; ligado: boolean; aoMudar: (ligado: boolean) => void; descricao?: string }) {
  return (
    <div className={estilos.linhaDoInterruptor}>
      <span id={`${id}-rotulo`} className={estilos.rotulo}>
        {rotulo}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-labelledby={`${id}-rotulo`}
        aria-describedby={descricao}
        onClick={() => aoMudar(!ligado)}
        className={estilos.interruptor}
      >
        <span className={estilos.trilho} aria-hidden="true">
          <span className={estilos.botaoDoTrilho} />
        </span>
        <span className={estilos.estado}>{ligado ? "Ativo" : "Inativo"}</span>
      </button>
    </div>
  );
}

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
        <Interruptor id={`${id}-artigos`} rotulo="Exibir Artigos no site" ligado={ativo} aoMudar={setAtivo} descricao={`${id}-efeitos`} />
        <div id={`${id}-efeitos`}>
          <CaixaDoPainel tipo="informacao">
            Desativado, o item &quot;Artigos&quot; sai do menu e do rodapé, as páginas /artigos respondem &quot;Página não encontrada&quot; e os banners com link para os Artigos ficam sem link. O painel de Artigos continua funcionando, e nada é apagado.
          </CaixaDoPainel>
        </div>
        <div tabIndex={-1} ref={resultadoRef} aria-live="polite">
          {resposta && <Mensagem tipo={resposta.ok ? "sucesso" : "erro"}>{resposta.mensagem}</Mensagem>}
        </div>
        <div className={estilos.botoes}>
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

// Tela /admin/configuracoes (30/10/2026): caixas por assunto.
export function ConfiguracoesClient({ trilha, descricao, artigosAtivo }: { trilha: PassoDaTrilha[]; descricao: string; artigosAtivo: boolean }) {
  return (
    <div className={estilos.pagina}>
      <CabecalhoDoPainel trilha={trilha} titulo="Configurações" descricao={descricao} />
      <CaixaDosArtigos inicial={artigosAtivo} />
    </div>
  );
}
