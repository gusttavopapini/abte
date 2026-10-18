"use client";

import { useActionState, useCallback, useEffect, useId, useState } from "react";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { EnviarMidia } from "@/app/admin/_componentes/EnviarMidia/EnviarMidia";
import { editarAltDaMidia, excluirMidia, excluirMidiaDeVez, restaurarMidia } from "@/app/admin/acoes-midia";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { Modal } from "@/components/Modal/Modal";
import { LIMITE_DO_ALT } from "@/lib/midia/regras";
import type { MidiaNaTela } from "@/lib/midia/tela";
import estilos from "./MidiaAdminClient.module.css";

type Props = { ativas: MidiaNaTela[]; excluidas: MidiaNaTela[]; podeExcluirDeVez: boolean };

type Janela =
  | { tipo: "enviar" }
  | { tipo: "editar"; midia: MidiaNaTela }
  | { tipo: "excluir"; midia: MidiaNaTela }
  | { tipo: "excluirDeVez"; midia: MidiaNaTela }
  | null;

// Busca sem diferença de maiúsculas e acentos.
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function Previa({ midia, sizes }: { midia: MidiaNaTela; sizes: string }) {
  if (midia.variantes.length === 0) return <div className={estilos.semPrevia}>Prévia indisponível</div>;
  return <ImagemDaMidia variantes={midia.variantes} alt={midia.alt} largura={midia.largura} altura={midia.altura} sizes={sizes} className={estilos.imagem} />;
}

function EditarAlt({ midia, aoTerminar, aoCancelar }: { midia: MidiaNaTela; aoTerminar: (mensagem: string) => void; aoCancelar: () => void }) {
  const [resposta, salvar, salvando] = useActionState(editarAltDaMidia, null);
  const id = useId();
  useEffect(() => {
    if (resposta?.ok) aoTerminar(resposta.mensagem);
  }, [resposta, aoTerminar]);
  return (
    <form action={salvar} className={estilos.formulario}>
      <input type="hidden" name="id" value={midia.id} />
      <Campo
        id={`${id}-alt`}
        name="alt"
        rotulo={`Texto alternativo (até ${LIMITE_DO_ALT} caracteres)`}
        obrigatorio
        maxLength={LIMITE_DO_ALT}
        defaultValue={midia.alt}
        autoComplete="off"
        erro={resposta?.ok === false ? resposta.erros?.alt ?? resposta.mensagem : undefined}
      />
      <div className={estilos.botoes}>
        <Botao type="button" variante="secundario" onClick={aoCancelar}>Cancelar</Botao>
        <Botao type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Botao>
      </div>
    </form>
  );
}

// Excluir para a lixeira. Se a imagem estiver em uso, a primeira resposta
// mostra onde, e o botão passa a ser "Excluir mesmo assim".
function ConfirmarExclusao({ midia, aoTerminar, aoCancelar }: { midia: MidiaNaTela; aoTerminar: (mensagem: string) => void; aoCancelar: () => void }) {
  const [resposta, excluir, excluindo] = useActionState(excluirMidia, null);
  useEffect(() => {
    if (resposta?.ok) aoTerminar(resposta.mensagem);
  }, [resposta, aoTerminar]);
  const emUso = resposta?.ok === false && resposta.usos && resposta.usos.length > 0 ? resposta.usos : null;
  return (
    <form action={excluir} className={estilos.formulario}>
      <input type="hidden" name="id" value={midia.id} />
      {emUso && <input type="hidden" name="confirmarUso" value="sim" />}
      <p className="tipo-texto">A imagem sai do site e vai para a lixeira. Dá para restaurar depois.</p>
      {resposta?.ok === false && (
        <Mensagem tipo="erro">
          {resposta.mensagem}
          {emUso && (
            <ul className={estilos.usos}>
              {emUso.map((uso) => (
                <li key={uso.rotulo}>
                  {uso.rotulo}: {uso.registros.join(", ")}
                </li>
              ))}
            </ul>
          )}
        </Mensagem>
      )}
      <div className={estilos.botoes}>
        <Botao type="button" variante="secundario" onClick={aoCancelar}>Cancelar</Botao>
        <Botao type="submit" disabled={excluindo}>{excluindo ? "Excluindo..." : emUso ? "Excluir mesmo assim" : "Excluir"}</Botao>
      </div>
    </form>
  );
}

function ConfirmarExclusaoDeVez({ midia, aoTerminar, aoCancelar }: { midia: MidiaNaTela; aoTerminar: (mensagem: string) => void; aoCancelar: () => void }) {
  const [resposta, excluir, excluindo] = useActionState(excluirMidiaDeVez, null);
  useEffect(() => {
    if (resposta?.ok) aoTerminar(resposta.mensagem);
  }, [resposta, aoTerminar]);
  return (
    <form action={excluir} className={estilos.formulario}>
      <input type="hidden" name="id" value={midia.id} />
      <p className="tipo-texto">
        A imagem &ldquo;{midia.alt}&rdquo; e os arquivos dela serão apagados. Esta ação não pode ser desfeita.
      </p>
      {resposta?.ok === false && <Mensagem tipo="erro">{resposta.mensagem}</Mensagem>}
      <div className={estilos.botoes}>
        <Botao type="button" variante="secundario" onClick={aoCancelar}>Cancelar</Botao>
        <Botao type="submit" disabled={excluindo}>{excluindo ? "Excluindo..." : "Excluir de vez"}</Botao>
      </div>
    </form>
  );
}

export function MidiaAdminClient({ ativas, excluidas, podeExcluirDeVez }: Props) {
  const [janela, setJanela] = useState<Janela>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [respostaRestaurar, restaurar, restaurando] = useActionState(restaurarMidia, null);
  const idBusca = useId();

  const fechar = useCallback(() => setJanela(null), []);
  const concluir = useCallback((mensagem: string) => {
    setJanela(null);
    setAviso(mensagem);
  }, []);
  const abrir = (nova: Janela) => {
    setAviso(null);
    setJanela(nova);
  };

  const termo = normalizar(busca.trim());
  const visiveis = termo ? ativas.filter((midia) => normalizar(midia.alt).includes(termo)) : ativas;

  return (
    <div className={estilos.pagina}>
      <CabecalhoDoPainel
        titulo="Mídia"
        descricao="Imagens do site. Cada imagem precisa de um texto alternativo."
        acao={<Botao onClick={() => abrir({ tipo: "enviar" })}>Enviar imagem</Botao>}
      />

      {aviso && <Mensagem tipo="sucesso">{aviso}</Mensagem>}

      <div className={estilos.busca}>
        <label htmlFor={idBusca} className={estilos.rotulo}>Buscar pelo texto alternativo</label>
        <input id={idBusca} type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} className={estilos.campoBusca} autoComplete="off" />
      </div>

      <p className="tipo-pequeno" aria-live="polite">
        {termo ? `${visiveis.length} de ${ativas.length} imagens` : `${ativas.length} ${ativas.length === 1 ? "imagem" : "imagens"}`}
      </p>

      {visiveis.length === 0 ? (
        <p className="tipo-texto">{ativas.length === 0 ? "Nenhuma imagem enviada ainda." : "Nenhuma imagem encontrada."}</p>
      ) : (
        <ul role="list" className={estilos.grade}>
          {visiveis.map((midia) => (
            <li key={midia.id} className={estilos.cartao}>
              <Previa midia={midia} sizes="(max-width: 767px) 90vw, 320px" />
              <div className={estilos.texto}>
                <p className={estilos.alt}>{midia.alt}</p>
                <p className={estilos.detalhes}>
                  {midia.largura} x {midia.altura} px{midia.enviadaEm && `, enviada em ${midia.enviadaEm}`}
                </p>
                {midia.indicaMenor && <p className={estilos.selo}>Criança ou adolescente, com autorização confirmada</p>}
              </div>
              <div className={estilos.acoes}>
                <button type="button" className={estilos.acao} onClick={() => abrir({ tipo: "editar", midia })} aria-label={`Editar o texto alternativo de ${midia.alt}`}>
                  Editar texto
                </button>
                <button type="button" className={estilos.acao} onClick={() => abrir({ tipo: "excluir", midia })} aria-label={`Excluir ${midia.alt}`}>
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className={estilos.lixeira} aria-labelledby="titulo-lixeira">
        <h2 id="titulo-lixeira" className="tipo-texto-lg">Lixeira</h2>
        <p className="tipo-pequeno">Imagens na lixeira estão fora do site.{podeExcluirDeVez ? "" : " Só administradores podem excluir de vez."}</p>
        {respostaRestaurar && <Mensagem tipo={respostaRestaurar.ok ? "sucesso" : "erro"}>{respostaRestaurar.mensagem}</Mensagem>}
        {excluidas.length === 0 ? (
          <p className="tipo-texto">A lixeira está vazia.</p>
        ) : (
          <ul role="list" className={estilos.listaLixeira}>
            {excluidas.map((midia) => (
              <li key={midia.id} className={estilos.linhaLixeira}>
                <div className={estilos.miniatura}>
                  <Previa midia={midia} sizes="120px" />
                </div>
                <span className={estilos.altLixeira}>{midia.alt}</span>
                <div className={estilos.acoes}>
                  <form action={restaurar}>
                    <input type="hidden" name="id" value={midia.id} />
                    <Botao type="submit" variante="secundario" disabled={restaurando} aria-label={`Restaurar ${midia.alt}`}>Restaurar</Botao>
                  </form>
                  {podeExcluirDeVez && (
                    <Botao type="button" variante="secundario" onClick={() => abrir({ tipo: "excluirDeVez", midia })} aria-label={`Excluir de vez ${midia.alt}`}>
                      Excluir de vez
                    </Botao>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal aberto={janela?.tipo === "enviar"} aoFechar={fechar} titulo="Enviar imagem">
        {janela?.tipo === "enviar" && <EnviarMidia aoEnviar={(mensagem) => concluir(mensagem)} aoCancelar={fechar} />}
      </Modal>
      <Modal aberto={janela?.tipo === "editar"} aoFechar={fechar} titulo="Editar texto alternativo">
        {janela?.tipo === "editar" && <EditarAlt midia={janela.midia} aoTerminar={concluir} aoCancelar={fechar} />}
      </Modal>
      <Modal aberto={janela?.tipo === "excluir"} aoFechar={fechar} titulo="Excluir imagem">
        {janela?.tipo === "excluir" && <ConfirmarExclusao midia={janela.midia} aoTerminar={concluir} aoCancelar={fechar} />}
      </Modal>
      <Modal aberto={janela?.tipo === "excluirDeVez"} aoFechar={fechar} titulo="Excluir de vez">
        {janela?.tipo === "excluirDeVez" && <ConfirmarExclusaoDeVez midia={janela.midia} aoTerminar={concluir} aoCancelar={fechar} />}
      </Modal>
    </div>
  );
}
