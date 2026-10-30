"use client";

import { useEffect, useId, useRef, useState } from "react";
import { EscolhaDaBiblioteca } from "@/app/admin/_componentes/EscolhaDaBiblioteca/EscolhaDaBiblioteca";
import { ImagemDoItem, type EscolhaDeImagem } from "@/app/admin/_componentes/ImagemDoItem/ImagemDoItem";
import type { DonoDaMidia } from "@/lib/midia/dono";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import type { ImagemNaTela, MidiaNaTela } from "@/lib/midia/tela";
import estilos from "./GaleriaDeMidia.module.css";

// Imagem da galeria: id gravado e a imagem, ou imagem null quando ela foi para
// a lixeira da biblioteca ou foi excluída.
export type ItemDaGaleria = { id: string; imagem: ImagemNaTela | null };

type Props = {
  // Nome dos campos escondidos (um por imagem, na ordem da galeria).
  nome: string;
  rotulo: string;
  inicial: ItemDaGaleria[];
  limite: number;
  erro?: string;
  // A que item as imagens enviadas aqui pertencem (29/10/2026).
  dono: DonoDaMidia;
  proporcao: string;
};

type Acao = "subir" | "descer" | "remover";

// Galeria de imagens dos formulários do painel (produtos): enviar cada
// imagem pelo próprio campo (com o texto alternativo dela, 29/10/2026) ou
// reutilizar uma da biblioteca, mudar a ordem com "Subir" e "Descer" (teclado)
// ou arrastando, e remover. A primeira é a principal. O formulário recebe um
// campo escondido por imagem, na ordem da tela.
export function GaleriaDeMidia({ nome, rotulo, inicial, limite, erro, dono, proporcao }: Props) {
  const id = useId();
  const [itens, setItens] = useState<ItemDaGaleria[]>(inicial);
  const [anuncio, setAnuncio] = useState("");
  const botoes = useRef(new Map<string, HTMLButtonElement>());
  // Botão que recebe o foco depois da próxima renderização (o item muda de
  // lugar na lista e o foco acompanha).
  const focoPendente = useRef<string | null>(null);

  useEffect(() => {
    const chave = focoPendente.current;
    if (!chave) return;
    focoPendente.current = null;
    botoes.current.get(chave)?.focus();
  });

  function descrever(item: ItemDaGaleria) {
    return item.imagem?.alt ?? "imagem indisponível";
  }

  // Leva o item de uma posição para outra (botões ou arrastar).
  function levar(de: number, para: number, focarEm?: Acao) {
    if (de === para || para < 0 || para >= itens.length) return;
    const novos = [...itens];
    const [item] = novos.splice(de, 1);
    novos.splice(para, 0, item);
    setItens(novos);
    if (focarEm) focoPendente.current = `${item.id}:${focarEm}`;
    setAnuncio(`${descrever(item)}: agora na posição ${para + 1} de ${novos.length}${para === 0 ? ", imagem principal" : ""}.`);
  }

  function mover(posicao: number, delta: -1 | 1) {
    const destino = posicao + delta;
    // Na ponta, o botão usado fica desativado: o foco vai para o outro.
    const acao: Acao = destino === 0 ? "descer" : destino === itens.length - 1 ? "subir" : delta < 0 ? "subir" : "descer";
    levar(posicao, destino, acao);
  }

  // Arrastar com o mouse (os botões continuam valendo para o teclado).
  const arrastado = useRef<number | null>(null);
  const [alvoDoArraste, setAlvoDoArraste] = useState<number | null>(null);

  function remover(posicao: number) {
    const item = itens[posicao];
    const novos = itens.filter((_, indice) => indice !== posicao);
    setItens(novos);
    const vizinho = novos[Math.min(posicao, novos.length - 1)];
    if (vizinho) focoPendente.current = `${vizinho.id}:remover`;
    setAnuncio(`${descrever(item)}: removida da galeria.`);
  }

  function aoEnviar(escolha: EscolhaDeImagem) {
    if (escolha) adicionar(escolha.id, escolha.imagem ? { ...escolha.imagem, id: escolha.id, indicaMenor: false, enviadaEm: "" } : null);
  }

  function adicionar(novoId: string, midia: MidiaNaTela | null) {
    if (itens.some((item) => item.id === novoId) || itens.length >= limite) return;
    setItens([...itens, { id: novoId, imagem: midia }]);
    setAnuncio(`${midia?.alt ?? "Imagem"}: adicionada na posição ${itens.length + 1}${itens.length === 0 ? ", imagem principal" : ""}.`);
  }

  const registrar = (chave: string) => (botao: HTMLButtonElement | null) => {
    if (botao) botoes.current.set(chave, botao);
    else botoes.current.delete(chave);
  };
  const idErro = `${id}-erro`;
  const noLimite = itens.length >= limite;

  return (
    <fieldset className={estilos.galeria} data-caixa-clara="" aria-describedby={erro ? idErro : `${id}-ajuda`}>
      <legend className={estilos.rotulo}>{rotulo}</legend>
      <p id={`${id}-ajuda`} className={estilos.texto}>
        A primeira imagem é a principal (aparece no card da loja). Até {limite} imagens. Para mudar a ordem, arraste a imagem ou use &ldquo;Subir&rdquo; e &ldquo;Descer&rdquo;.
      </p>
      {itens.map((item) => (
        <input key={item.id} type="hidden" name={nome} value={item.id} />
      ))}

      {itens.length === 0 ? (
        <p className={estilos.texto}>Nenhuma imagem. O site mostra o espaço de imagem.</p>
      ) : (
        <ol className={estilos.lista}>
          {itens.map((item, posicao) => {
            const descricao = descrever(item);
            return (
              <li
                key={item.id}
                className={`${estilos.item} ${alvoDoArraste === posicao ? estilos.alvo : ""}`}
                draggable
                onDragStart={(evento) => {
                  arrastado.current = posicao;
                  evento.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(evento) => {
                  if (arrastado.current === null) return;
                  evento.preventDefault();
                  setAlvoDoArraste(posicao);
                }}
                onDragLeave={() => setAlvoDoArraste(null)}
                onDrop={(evento) => {
                  evento.preventDefault();
                  if (arrastado.current !== null) levar(arrastado.current, posicao);
                  arrastado.current = null;
                  setAlvoDoArraste(null);
                }}
                onDragEnd={() => {
                  arrastado.current = null;
                  setAlvoDoArraste(null);
                }}
              >
                <div className={estilos.miniatura}>
                  {item.imagem ? (
                    <ImagemDaMidia variantes={item.imagem.variantes} alt="" largura={item.imagem.largura} altura={item.imagem.altura} sizes="96px" className={estilos.imagem} />
                  ) : (
                    <span className={estilos.indisponivel}>Indisponível</span>
                  )}
                </div>
                <div className={estilos.info}>
                  <p className={estilos.posicao}>
                    {posicao + 1} de {itens.length}
                    {posicao === 0 && ", principal"}
                  </p>
                  <p className={estilos.texto}>
                    {item.imagem ? item.imagem.alt : "Esta imagem foi para a lixeira da biblioteca ou foi excluída. Remova-a ou restaure em Mídia."}
                  </p>
                  <div className={estilos.acoes}>
                    <button
                      ref={registrar(`${item.id}:subir`)}
                      type="button"
                      className={`realce ${estilos.acao}`}
                      onClick={() => mover(posicao, -1)}
                      disabled={posicao === 0}
                      aria-label={`Subir ${descricao} (posição ${posicao + 1} de ${itens.length})`}
                    >
                      Subir
                    </button>
                    <button
                      ref={registrar(`${item.id}:descer`)}
                      type="button"
                      className={`realce ${estilos.acao}`}
                      onClick={() => mover(posicao, 1)}
                      disabled={posicao === itens.length - 1}
                      aria-label={`Descer ${descricao} (posição ${posicao + 1} de ${itens.length})`}
                    >
                      Descer
                    </button>
                    <button
                      ref={registrar(`${item.id}:remover`)}
                      type="button"
                      className={`realce ${estilos.acao}`}
                      onClick={() => remover(posicao)}
                      aria-label={`Remover ${descricao} da galeria`}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {noLimite ? (
        <p className={estilos.texto}>A galeria chegou ao limite de {limite} imagens. Remova uma para adicionar outra.</p>
      ) : (
        <>
          <ImagemDoItem rotulo="Adicionar imagem à galeria" inicial={null} dono={dono} proporcao={proporcao} textoDoEnvio="Adicionar à galeria" soEnvio aoMudar={aoEnviar} />
          <EscolhaDaBiblioteca
            soBiblioteca
            rotuloDaBiblioteca="Reutilizar imagem já enviada"
            jaEscolhidas={itens.map((item) => item.id)}
            bloquearEscolhidas
            aoEscolher={adicionar}
          />
        </>
      )}

      {erro && <p id={idErro} className={estilos.erro}>{erro}</p>}
      <p className="somente-leitor" aria-live="polite">{anuncio}</p>
    </fieldset>
  );
}
