"use client";

import { useId, useRef, useState } from "react";
import { EscolhaDaBiblioteca, type ControleDaEscolha } from "@/app/admin/_componentes/EscolhaDaBiblioteca/EscolhaDaBiblioteca";
import { Botao } from "@/components/Botao/Botao";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import type { ImagemNaTela, MidiaNaTela } from "@/lib/midia/tela";
import estilos from "./SeletorDeMidia.module.css";

// Escolha atual: o id gravado e a imagem, ou imagem null quando ela foi para a
// lixeira da biblioteca ou foi excluída (o site mostra o espaço de imagem).
export type EscolhaDeMidia = { id: string; imagem: ImagemNaTela | null } | null;

type Props = {
  // Nome do campo escondido que vai no formulário (ex.: "fotoMidiaId").
  nome: string;
  rotulo: string;
  inicial: EscolhaDeMidia;
  erro?: string;
  // Avisa quem usa o seletor quando a escolha muda (id, ou null sem imagem).
  aoMudar?: (id: string | null) => void;
};

// Campo de imagem dos formulários do painel: escolher uma imagem da biblioteca,
// ver a prévia, remover a escolha ou enviar uma imagem nova sem sair do
// formulário. O texto alternativo vem da biblioteca e só é mostrado aqui (a
// edição fica em /admin/midia). O formulário recebe só o id, num campo
// escondido; a gravação confere no servidor se a imagem existe.
export function SeletorDeMidia({ nome, rotulo, inicial, erro, aoMudar }: Props) {
  const [escolha, setEscolhaInterna] = useState<EscolhaDeMidia>(inicial);
  const [anuncio, setAnuncio] = useState("");
  const escolhaRef = useRef<ControleDaEscolha>(null);
  const idErro = `${useId()}-erro`;

  function setEscolha(nova: EscolhaDeMidia) {
    setEscolhaInterna(nova);
    aoMudar?.(nova?.id ?? null);
  }

  function aoEscolher(id: string, midia: MidiaNaTela | null) {
    setEscolha({ id, imagem: midia });
    setAnuncio(midia ? `Imagem escolhida: ${midia.alt}` : "Imagem enviada e escolhida.");
  }

  function remover() {
    setEscolha(null);
    setAnuncio("Imagem removida. O site vai mostrar o espaço de imagem.");
    escolhaRef.current?.focar();
  }

  return (
    <fieldset className={estilos.seletor} aria-describedby={erro ? idErro : undefined}>
      <legend className={estilos.rotulo}>{rotulo}</legend>
      <input type="hidden" name={nome} value={escolha?.id ?? ""} />

      <div className={estilos.escolha}>
        {escolha?.imagem ? (
          <>
            <div className={estilos.previa}>
              <ImagemDaMidia
                variantes={escolha.imagem.variantes}
                alt={escolha.imagem.alt}
                largura={escolha.imagem.largura}
                altura={escolha.imagem.altura}
                sizes="160px"
                className={estilos.imagemDaPrevia}
              />
            </div>
            <p className={`${estilos.texto} ${estilos.ladoDaPrevia}`}>
              <span className={estilos.legenda}>Texto alternativo (editável em Mídia):</span> {escolha.imagem.alt}
            </p>
          </>
        ) : (
          <p className={estilos.texto}>
            {escolha
              ? "A imagem escolhida foi para a lixeira da biblioteca ou foi excluída. O site mostra o espaço de imagem."
              : "Nenhuma imagem escolhida. O site mostra o espaço de imagem."}
          </p>
        )}
      </div>

      <EscolhaDaBiblioteca
        controle={escolhaRef}
        rotuloDaBiblioteca={escolha ? "Trocar pela biblioteca" : "Escolher da biblioteca"}
        jaEscolhidas={escolha ? [escolha.id] : []}
        aoEscolher={aoEscolher}
        extra={
          escolha && (
            <Botao type="button" variante="secundario" onClick={remover}>
              Remover imagem
            </Botao>
          )
        }
      />

      {erro && <p id={idErro} className={estilos.erro}>{erro}</p>}
      <p className="somente-leitor" aria-live="polite">{anuncio}</p>
    </fieldset>
  );
}
