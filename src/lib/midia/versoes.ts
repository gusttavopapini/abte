// Versões de uma imagem por faixa de tela (30/10/2026, banners da home):
// computador a partir de 1024 px, tablet de 768 a 1023 px e celular até
// 767 px. Cadeia de substituição: o celular usa a de tablet e, sem ela, a de
// computador; o tablet usa a de computador. Puro (sem dependências).
import type { ImagemNaTela } from "./tela.ts";

function utilizavel(imagem: ImagemNaTela | null | undefined): imagem is ImagemNaTela {
  return Boolean(imagem && imagem.variantes.length > 0 && imagem.largura > 0 && imagem.altura > 0);
}

// Fontes do <picture>: a de cada faixa estreita, ou null quando a faixa usa a
// imagem de computador (a <img>).
export function fontesPorFaixa(versoes: { celular?: ImagemNaTela | null; tablet?: ImagemNaTela | null }): { celular: ImagemNaTela | null; tablet: ImagemNaTela | null } {
  const tablet = utilizavel(versoes.tablet) ? versoes.tablet : null;
  const celular = utilizavel(versoes.celular) ? versoes.celular : tablet;
  return { celular, tablet };
}
