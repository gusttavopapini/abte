// Vídeo vertical da section "Quem Somos" da home (29/10/2026). É o único
// lugar para configurar: cole aqui o endereço do vídeo quando a ABTE
// enviar. Vale um link do YouTube (watch, youtu.be, shorts ou embed; exibido
// pelo youtube-nocookie.com, sem cookies até o play) ou um arquivo .mp4 ou
// .webm (em public/, começando por "/", ou num endereço https). Vazio, a
// home mostra o espaço "Vídeo em breve". Nunca inventar um vídeo.
export const VIDEO_QUEM_SOMOS = "";

export type VideoParaExibir = { tipo: "youtube"; endereco: string } | { tipo: "arquivo"; endereco: string };

// Id de vídeo do YouTube: 11 caracteres.
const ID_DO_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;
const HOSTS_DO_YOUTUBE = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);
const ARQUIVO_DE_VIDEO = /\.(mp4|webm)$/i;

function idDoYoutube(url: URL): string | null {
  const partes = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (url.hostname === "youtu.be") id = partes[0] ?? null;
  else if (HOSTS_DO_YOUTUBE.has(url.hostname)) {
    if (partes[0] === "watch") id = url.searchParams.get("v");
    else if (partes[0] === "shorts" || partes[0] === "embed") id = partes[1] ?? null;
  }
  return id && ID_DO_YOUTUBE.test(id) ? id : null;
}

// Id do vídeo a partir de um link do YouTube (youtube.com, youtu.be e
// youtube-nocookie.com, só https), ou null. Usado pelo painel (30/10/2026).
export function idDoYoutubeDoLink(texto: string): string | null {
  try {
    const url = new URL(texto.trim());
    return url.protocol === "https:" ? idDoYoutube(url) : null;
  } catch {
    return null;
  }
}

// Endereço configurado para o que a página exibe; vazio ou não reconhecido
// dá null (a página mostra o espaço "Vídeo em breve").
export function videoParaExibir(endereco: string): VideoParaExibir | null {
  const texto = endereco.trim();
  if (!texto) return null;
  // Arquivo do próprio site (public/), sem "//" para não virar outro host.
  if (texto.startsWith("/") && !texto.startsWith("//") && !texto.includes("\\")) {
    return ARQUIVO_DE_VIDEO.test(texto.split(/[?#]/)[0]) ? { tipo: "arquivo", endereco: texto } : null;
  }
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const id = idDoYoutube(url);
  if (id) return { tipo: "youtube", endereco: `https://www.youtube-nocookie.com/embed/${id}` };
  if (url.hostname === "youtu.be" || HOSTS_DO_YOUTUBE.has(url.hostname)) return null;
  return ARQUIVO_DE_VIDEO.test(url.pathname) ? { tipo: "arquivo", endereco: url.toString() } : null;
}
