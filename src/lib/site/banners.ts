// Slides do banner principal da home (Hero), num lugar só (29/10/2026).
// "href" vazio: o slide não é link (destino a definir pela ABTE; nunca
// inventar). Com "href", o slide inteiro vira link, com "rotulo" como nome
// para leitores de tela (sem rótulo, vale o "alt"). Aceita caminho interno
// ("/loja") ou endereço https.
export type SlideDoBanner = {
  imagem: string;
  alt: string;
  href: string;
  rotulo: string;
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
