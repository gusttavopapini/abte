"use client";

import { type MouseEvent, useRef } from "react";
import { Botao } from "@/components/Botao/Botao";
import { ContatosProfissional } from "@/components/ContatosProfissional/ContatosProfissional";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { MetodosProfissional } from "@/components/MetodosProfissional/MetodosProfissional";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import type { ProfissionalPublico } from "@/lib/profissionaisPublicos";
import { resumirTexto } from "@/lib/texto";
import estilos from "./CardProfissional.module.css";

// Dados que o card mostra (já validados e padronizados no painel).
export type ProfissionalDoCard = Omit<ProfissionalPublico, "id" | "tipo">;

// Tamanho da apresentação no card (28/10/2026); o texto completo fica no popup.
export const LIMITE_DA_APRESENTACAO_NO_CARD = 140;

// Largura do card na grade de /profissionais (1, 2 e 4 colunas), para o
// navegador escolher a variante da foto.
const LARGURA_DA_FOTO = "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw";

export function nomeCompletoDoProfissional({ tratamento, nome }: Pick<ProfissionalDoCard, "tratamento" | "nome">): string {
  return [tratamento, nome].filter(Boolean).join(" ");
}

// Card do diretório de profissionais. Com foto, mostra a imagem da biblioteca
// (texto alternativo cadastrado nela); sem foto, o placeholder. "Ver mais"
// (e o clique em qualquer ponto do card fora de links e botões) abre o popup.
export function CardProfissional({ profissional, aoVerMais }: { profissional: ProfissionalDoCard; aoVerMais: () => void }) {
  const { registro, metodos, local, telerreabilitacao, whatsapp, instagram, facebook, email, bio, foto } = profissional;
  const nomeCompleto = nomeCompletoDoProfissional(profissional);
  const verMaisRef = useRef<HTMLButtonElement>(null);

  // O foco vai antes para "Ver mais", para o popup devolvê-lo ali ao fechar
  // (também quando o clique foi na foto ou no texto, ou no Safari, que não
  // foca botões com o clique).
  function abrir() {
    verMaisRef.current?.focus({ preventScroll: true });
    aoVerMais();
  }

  // Clique de mouse ou toque no card. Links e botões seguem o próprio
  // comportamento (o "Ver mais" já abre sozinho), e selecionar texto não abre.
  function aoClicarNoCard(evento: MouseEvent<HTMLElement>) {
    if (evento.target instanceof Element && evento.target.closest("a, button")) return;
    if (window.getSelection()?.toString()) return;
    abrir();
  }

  // Ordem fixa (padronização de 25/10/2026): foto, nome, registro, local,
  // métodos, apresentação curta e contatos; "Ver mais" fica no fim do card.
  return (
    <article className={estilos.card} onClick={aoClicarNoCard}>
      <div className={estilos.imagemContainer}>
        {foto ? (
          <ImagemDaMidia variantes={foto.variantes} alt={foto.alt} largura={foto.largura} altura={foto.altura} sizes={LARGURA_DA_FOTO} className={estilos.imagem} />
        ) : (
          <PlaceholderImagem />
        )}
      </div>
      <div className={estilos.conteudo}>
        <div className={estilos.cabecalho}>
          <h3 className={estilos.nome}>{nomeCompleto}</h3>
          {registro && <p className={estilos.especialidade}>{registro}</p>}
        </div>
        {local && <p className={estilos.texto}>{local}</p>}
        {telerreabilitacao && <p className={estilos.texto}>Atende por telerreabilitação</p>}
        <MetodosProfissional metodos={metodos} />
        {bio && <p className={estilos.texto}>{resumirTexto(bio, LIMITE_DA_APRESENTACAO_NO_CARD)}</p>}
        <ContatosProfissional nomeCompleto={nomeCompleto} whatsapp={whatsapp} instagram={instagram} facebook={facebook} email={email} />
        <div className={estilos.rodape}>
          <Botao ref={verMaisRef} variante="secundario" onClick={abrir} aria-haspopup="dialog">
            Ver mais<span className="somente-leitor"> sobre {nomeCompleto}</span>
          </Botao>
        </div>
      </div>
    </article>
  );
}
