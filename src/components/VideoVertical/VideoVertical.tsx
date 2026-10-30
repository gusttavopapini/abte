"use client";

import { useState } from "react";
import { IconePlay } from "@/components/Icones/Icones";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import type { ImagemNaTela } from "@/lib/midia/tela";
import { videoParaExibir } from "@/lib/site/video";
import estilos from "./VideoVertical.module.css";

// Vídeo cadastrado no painel (30/10/2026, /admin/home).
export type FonteDoVideo =
  | { tipo: "arquivo"; src: string; contentType: string; descricao: string; capa: ImagemNaTela | null; poster: string | null; legenda: string | null }
  | { tipo: "youtube"; youtubeId: string; descricao: string; capa: ImagemNaTela | null };

// Capa do vídeo com um só botão de play no centro (30/10/2026): a imagem
// preenche a caixa 9:16; sem capa, a caixa na cor de token, com o play.
// Usada pelo site e pela prévia do painel (sem ação: só o desenho).
export function CapaDoVideo({ capa, descricao, aoTocar }: { capa: ImagemNaTela | null; descricao: string; aoTocar?: () => void }) {
  return (
    <div className={estilos.capaDoVideo}>
      {capa && <ImagemDaMidia variantes={capa.variantes} alt="" largura={capa.largura} altura={capa.altura} sizes="(max-width: 1023px) 360px, 360px" className={estilos.imagemDaCapa} />}
      <div className={estilos.centro}>
        {aoTocar ? (
          <button type="button" className={estilos.play} onClick={aoTocar} aria-label={`Reproduzir vídeo: ${descricao}`}>
            <IconePlay className={estilos.iconePlay} />
          </button>
        ) : (
          <span className={estilos.play} aria-hidden="true">
            <IconePlay className={estilos.iconePlay} />
          </span>
        )}
      </div>
    </div>
  );
}

// Vídeo vertical (9:16) da home (29/10/2026). Desde 30/10/2026, com o vídeo
// do painel: a capa e o play; o clique troca pelo player no mesmo lugar, já
// tocando (YouTube sem cookies com autoplay, ou o arquivo com controles).
// Antes do clique, nada do YouTube nem do arquivo é carregado. Sem vídeo no
// painel, o endereço de src/lib/site/video.ts, como antes; sem nenhum,
// "Vídeo em breve".
export function VideoVertical({ endereco, titulo, fonte }: { endereco: string; titulo: string; fonte?: FonteDoVideo | null }) {
  const [tocar, setTocar] = useState(false);
  if (fonte) {
    return (
      <div className={estilos.moldura}>
        {!tocar ? (
          <CapaDoVideo capa={fonte.capa} descricao={fonte.descricao} aoTocar={() => setTocar(true)} />
        ) : fonte.tipo === "youtube" ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${fonte.youtubeId}?autoplay=1&playsinline=1&rel=0`}
            title={fonte.descricao}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className={estilos.midia}
          />
        ) : (
          <video controls playsInline autoPlay poster={fonte.poster ?? undefined} aria-label={fonte.descricao} className={estilos.midia}>
            <source src={fonte.src} type={fonte.contentType} />
            {fonte.legenda && <track kind="captions" src={fonte.legenda} srcLang="pt-BR" label="Português" default />}
            Seu navegador não mostra este vídeo.
          </video>
        )}
      </div>
    );
  }
  const video = videoParaExibir(endereco);
  return (
    <div className={estilos.moldura}>
      {video?.tipo === "youtube" ? (
        <iframe
          src={video.endereco}
          title={titulo}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className={estilos.midia}
        />
      ) : video?.tipo === "arquivo" ? (
        <video src={video.endereco} title={titulo} controls playsInline preload="metadata" className={estilos.midia}>
          Seu navegador não mostra este vídeo.
        </video>
      ) : (
        <p className={estilos.emBreve}>Vídeo em breve</p>
      )}
    </div>
  );
}
