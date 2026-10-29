import { videoParaExibir } from "@/lib/site/video";
import estilos from "./VideoVertical.module.css";

// Vídeo vertical (9:16) da home (29/10/2026). Recebe o endereço configurado
// em src/lib/site/video.ts: YouTube sem cookies ou arquivo de vídeo. Sem
// endereço válido, mostra o espaço marcado "Vídeo em breve".
export function VideoVertical({ endereco, titulo }: { endereco: string; titulo: string }) {
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
