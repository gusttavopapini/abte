// Slides do banner principal da home (Hero), num lugar só (29/10/2026).
// "href" vazio: o slide não é link (destino a definir pela ABTE; nunca
// inventar). Com "href", o slide inteiro vira link, com "rotulo" como nome
// para leitores de tela (sem rótulo, vale o "alt"). Aceita caminho interno
// ("/loja") ou endereço https.
import type { ImagemNaTela } from "../midia/tela.ts";

export type SlideDoBanner = {
  imagem: string;
  // Imagem da biblioteca escolhida no painel (29/10/2026, lib/site/home.ts);
  // sem ela, vale o endereço em "imagem" (slides padrão).
  midia?: ImagemNaTela & { celular?: ImagemNaTela | null; tablet?: ImagemNaTela | null };
  // Parte da imagem que fica à vista quando a tela corta as laterais
  // (banner do painel, 30/10/2026); ausente vale o centro.
  pontoDeFoco?: "esquerda" | "centro" | "direita";
  alt: string;
  href: string;
  rotulo: string;
  // Texto e botão em código sobre a imagem (banner do painel, 30/10/2026);
  // null ou ausente: só a imagem, como antes.
  texto?: {
    titulo: string;
    trechoEmDestaque: string;
    subtitulo: string;
    textoDoBotao: string;
    posicao: "esquerda" | "centro" | "direita";
  } | null;
};

// Imagens provisórias (picsum.photos, ver "Conteúdo de terceiros" no
// CLAUDE.md) e texto alternativo ainda genérico, como antes.
export const SLIDES_DO_BANNER: SlideDoBanner[] = [
  { imagem: "https://picsum.photos/id/1018/1920/800", alt: "Slide 1", href: "", rotulo: "" },
  { imagem: "https://picsum.photos/id/1015/1920/800", alt: "Slide 2", href: "", rotulo: "" },
  { imagem: "https://picsum.photos/id/1016/1920/800", alt: "Slide 3", href: "", rotulo: "" },
];

// Link do slide, ou null quando ele não tem destino válido.
export function linkDoSlide(slide: Pick<SlideDoBanner, "href" | "rotulo" | "alt">): { href: string; nome: string } | null {
  const href = slide.href.trim();
  if (!href) return null;
  // Seção da home (30/10/2026): "#âncora" vira "/#âncora", que funciona de
  // qualquer página; na home, o Hero rola até a seção.
  if (/^#[a-z0-9-]{1,60}$/.test(href)) return { href: `/${href}`, nome: slide.rotulo.trim() || slide.alt.trim() };
  const interno = href.startsWith("/") && !href.startsWith("//") && !href.includes("\\");
  let externo = false;
  if (!interno) {
    try {
      externo = new URL(href).protocol === "https:";
    } catch {
      externo = false;
    }
  }
  if (!interno && !externo) return null;
  return { href, nome: slide.rotulo.trim() || slide.alt.trim() };
}
