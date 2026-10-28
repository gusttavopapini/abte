"use client";

import { Botao } from "@/components/Botao/Botao";
import { nomeCompletoDoProfissional, type ProfissionalDoCard } from "@/components/CardProfissional/CardProfissional";
import { ContatosProfissional } from "@/components/ContatosProfissional/ContatosProfissional";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { MetodosProfissional } from "@/components/MetodosProfissional/MetodosProfissional";
import { Modal } from "@/components/Modal/Modal";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import { paragrafosDoTexto } from "@/lib/texto";
import estilos from "./PopupProfissional.module.css";

// Largura da foto no popup: tela toda no celular, coluna da janela nas outras.
const LARGURA_DA_FOTO = "(max-width: 767px) 100vw, 320px";

// Detalhes do profissional sobre a página (28/10/2026): foto maior, todos os
// dados do card e a apresentação completa, com um parágrafo por linha. Usa o
// Modal (Esc, foco preso e devolvido, fundo sem rolar); o título é o nome.
export function PopupProfissional({ profissional, aoFechar }: { profissional: ProfissionalDoCard | null; aoFechar: () => void }) {
  if (!profissional) return null;
  const { registro, metodos, local, telerreabilitacao, whatsapp, instagram, facebook, email, bio, foto } = profissional;
  const nomeCompleto = nomeCompletoDoProfissional(profissional);
  const paragrafos = paragrafosDoTexto(bio);

  return (
    <Modal aberto aoFechar={aoFechar} titulo={nomeCompleto} largura="larga" focoInicial="fechar">
      <div className={estilos.corpo}>
        <div className={estilos.imagemContainer}>
          {foto ? (
            <ImagemDaMidia variantes={foto.variantes} alt={foto.alt} largura={foto.largura} altura={foto.altura} sizes={LARGURA_DA_FOTO} className={estilos.imagem} />
          ) : (
            <PlaceholderImagem />
          )}
        </div>
        <div className={estilos.dados}>
          {registro && <p className={estilos.texto}>{registro}</p>}
          {local && <p className={estilos.texto}>{local}</p>}
          {telerreabilitacao && <p className={estilos.texto}>Atende por telerreabilitação</p>}
          <MetodosProfissional metodos={metodos} />
          {paragrafos.length > 0 && (
            <div className={estilos.apresentacao}>
              {paragrafos.map((paragrafo, indice) => <p key={indice}>{paragrafo}</p>)}
            </div>
          )}
          <ContatosProfissional nomeCompleto={nomeCompleto} whatsapp={whatsapp} instagram={instagram} facebook={facebook} email={email} />
        </div>
      </div>
      <div className={estilos.rodape}>
        <Botao variante="secundario" onClick={aoFechar}>Fechar</Botao>
      </div>
    </Modal>
  );
}
