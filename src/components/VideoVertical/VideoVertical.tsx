"use client";

import { useState } from "react";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import type { ImagemNaTela } from "@/lib/midia/tela";
import { videoParaExibir } from "@/lib/site/video";
import estilos from "./VideoVertical.module.css";

// Vídeo cadastrado no painel (30/10/2026, /admin/home).
export type FonteDoVideo =
  | { tipo: "arquivo"; src: string; contentType: string; descricao: string; poster: string | null; legenda: string | null }
  | { tipo: "youtube"; youtubeId: string; descricao: string; capa: ImagemNaTela | null };

// Vídeo vertical (9:16) da home (29/10/2026). Desde 30/10/2026, com o vídeo
// do painel: arquivo com controles, sem reprodução automática, poster da
// capa, legenda quando houver e a descrição como nome; ou YouTube sem
// cookies, carregado só depois do clique na fachada (a capa). Sem vídeo no
// painel, o endereço de src/lib/site/video.ts, como antes; sem nenhum,
// "Vídeo em breve".
export function VideoVertical({ endereco, titulo, fonte }: { endereco: string; titulo: string; fonte?: FonteDoVideo | null }) {
  const [tocar, setTocar] = useState(false);
  if (fonte?.tipo === "arquivo") {
    return (
      <div className={estilos.moldura}>
        <video controls playsInline preload="metadata" poster={fonte.poster ?? undefined} aria-label={fonte.descricao} className={estilos.midia}>
          <source src={fonte.src} type={fonte.contentType} />
          {fonte.legenda && <track kind="captions" src={fonte.legenda} srcLang="pt-BR" label="Português" default />}
          Seu navegador não mostra este vídeo.
        </video>
      </div>
    );
  }
  if (fonte?.tipo === "youtube") {
    return (
      <div className={estilos.moldura}>
        {tocar ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${fonte.youtubeId}?autoplay=1`}
            title={fonte.descricao}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className={estilos.midia}
          />
        ) : (
          <button type="button" className={estilos.fachada} onClick={() => setTocar(true)}>
            {fonte.capa && <ImagemDaMidia variantes={fonte.capa.variantes} alt="" largura={fonte.capa.largura} altura={fonte.capa.altura} sizes="360px" className={estilos.capa} />}
            <span className={estilos.tocar}>
              <span aria-hidden="true">&#9654;</span> Assistir ao vídeo<span className="somente-leitor">: {fonte.descricao} (YouTube)</span>
            </span>
          </button>
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
