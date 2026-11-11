// Enquadramento de um bloco da home ao chegar pela âncora (11/11/2026, item
// "Quem Somos" do menu). Puro (sem DOM), testado em
// testes/unidade/enquadramento.test.mts.

// Rolagem (em px) a partir da qual o header pode se esconder e ganha fundo
// sólido; acima dela, o header fica como no topo da página.
export const LIMITE_DE_ROLAGEM_PX = 80;
// Movimentos menores que isto são ignorados pelo header, para ele não piscar
// com pequenas oscilações da rolagem (trackpad).
export const TOLERANCIA_DE_ROLAGEM_PX = 8;

export type MedidasDoEnquadramento = {
  // Topo do bloco na página (não na janela) e a altura dele.
  topoDoBloco: number;
  alturaDoBloco: number;
  rolagemAtual: number;
  rolagemMaxima: number;
  alturaDaJanela: number;
  // Altura inteira do header (--altura-do-header) e se ele aparece agora.
  alturaDoHeader: number;
  headerVisivelAgora: boolean;
  // Folga entre o header e o topo do bloco quando o bloco não cabe.
  margem: number;
};

export type Enquadramento = { destino: number; headerVisivel: boolean; cabe: boolean };

function limitar(valor: number, maximo: number): number {
  return Math.round(Math.min(Math.max(valor, 0), Math.max(maximo, 0)));
}

// Destino para uma área visível que começa em "inicio" (0 com o header
// escondido; a altura dele com o header aparecendo): o centro do bloco no
// centro da área ou, se o bloco não cabe, o topo dele "margem" abaixo do
// início da área.
function destinoPara(m: MedidasDoEnquadramento, inicio: number): { destino: number; cabe: boolean } {
  const area = m.alturaDaJanela - inicio;
  const cabe = m.alturaDoBloco <= area;
  const bruto = cabe ? m.topoDoBloco + m.alturaDoBloco / 2 - (inicio + area / 2) : m.topoDoBloco - inicio - m.margem;
  return { destino: limitar(bruto, m.rolagemMaxima), cabe };
}

// O header se esconde ao rolar para baixo e volta ao rolar para cima (acima
// de LIMITE_DE_ROLAGEM_PX ele sempre aparece; movimentos menores que a
// tolerância não mudam nada). O estado dele no fim da rolagem depende do
// destino, que depende do estado: testa as duas hipóteses e fica com a
// coerente.
export function enquadrarBloco(m: MedidasDoEnquadramento): Enquadramento {
  const escondido = destinoPara(m, 0);
  if (escondido.destino - m.rolagemAtual >= TOLERANCIA_DE_ROLAGEM_PX && escondido.destino > LIMITE_DE_ROLAGEM_PX) {
    return { ...escondido, headerVisivel: false };
  }
  const visivel = destinoPara(m, m.alturaDoHeader);
  if (m.rolagemAtual - visivel.destino >= TOLERANCIA_DE_ROLAGEM_PX || visivel.destino <= LIMITE_DE_ROLAGEM_PX) {
    return { ...visivel, headerVisivel: true };
  }
  // Movimento pequeno demais para o header mudar: fica como está.
  return m.headerVisivelAgora ? { ...visivel, headerVisivel: true } : { ...escondido, headerVisivel: false };
}
