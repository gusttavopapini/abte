// Tipos da mídia como as telas recebem (sem dependências): endereços já
// montados no servidor (exibicao.ts), sem caminhos do Storage nem uids.

// Variante pronta para a tela: largura e endereço.
export type VarianteNaTela = { largura: number; url: string };

// Imagem pronta para exibir com o componente ImagemDaMidia.
export type ImagemNaTela = {
  alt: string;
  // Medidas da imagem (proporção), para reservar o espaço e evitar saltos.
  largura: number;
  altura: number;
  // Vazia quando não há prévia (ex.: falha ao gerar o endereço da lixeira).
  variantes: VarianteNaTela[];
};

// Imagem na biblioteca do painel (tela /admin/midia e seletor de mídia).
export type MidiaNaTela = ImagemNaTela & {
  id: string;
  indicaMenor: boolean;
  enviadaEm: string;
};
