// Enquadramento do bloco de Quem Somos ao chegar pela âncora (11/11/2026).
import assert from "node:assert/strict";
import { test } from "node:test";
import { enquadrarBloco, type MedidasDoEnquadramento } from "../../src/lib/site/enquadramento.ts";

const base: MedidasDoEnquadramento = {
  topoDoBloco: 3000,
  alturaDoBloco: 640,
  rolagemAtual: 0,
  rolagemMaxima: 10000,
  alturaDaJanela: 900,
  alturaDoHeader: 148,
  headerVisivelAgora: true,
  margem: 24,
};

test("descendo: header escondido, centro do bloco no centro da janela inteira", () => {
  const r = enquadrarBloco(base);
  assert.deepEqual(r, { destino: 3000 + 320 - 450, headerVisivel: false, cabe: true });
});

test("subindo: header aparece, centro do bloco no centro da janela menos o header", () => {
  const r = enquadrarBloco({ ...base, rolagemAtual: 6000 });
  const area = 900 - 148;
  assert.deepEqual(r, { destino: Math.round(3000 + 320 - (148 + area / 2)), headerVisivel: true, cabe: true });
});

test("bloco mais alto que a área: topo 24px abaixo do header", () => {
  const descendo = enquadrarBloco({ ...base, alturaDoBloco: 1400 });
  assert.deepEqual(descendo, { destino: 3000 - 24, headerVisivel: false, cabe: false });
  const subindo = enquadrarBloco({ ...base, alturaDoBloco: 1400, rolagemAtual: 6000 });
  assert.deepEqual(subindo, { destino: 3000 - 148 - 24, headerVisivel: true, cabe: false });
});

test("cabe só com o header escondido: descendo centraliza, subindo alinha o topo", () => {
  const medidas = { ...base, alturaDoBloco: 800 };
  assert.equal(enquadrarBloco(medidas).cabe, true);
  const subindo = enquadrarBloco({ ...medidas, rolagemAtual: 6000 });
  assert.equal(subindo.cabe, false);
  assert.equal(subindo.destino, 3000 - 148 - 24);
});

test("movimento menor que a tolerância nas duas hipóteses mantém o header como está", () => {
  // Header baixo: os dois destinos ficam a menos de 8px da posição atual.
  const medidas = { ...base, alturaDoHeader: 10, rolagemAtual: 2868 };
  assert.deepEqual(enquadrarBloco({ ...medidas, headerVisivelAgora: false }), { destino: 2870, headerVisivel: false, cabe: true });
  assert.deepEqual(enquadrarBloco({ ...medidas, headerVisivelAgora: true }), { destino: 2865, headerVisivel: true, cabe: true });
});

test("descida curta mas maior que a tolerância: o header some", () => {
  const ja = 3000 + 320 - 450;
  assert.equal(enquadrarBloco({ ...base, rolagemAtual: ja - 10 }).headerVisivel, false);
});

test("destino limitado ao começo e ao fim da página", () => {
  assert.equal(enquadrarBloco({ ...base, topoDoBloco: 100 }).destino, 0);
  assert.equal(enquadrarBloco({ ...base, rolagemMaxima: 2000 }).destino, 2000);
});

test("perto do topo (até 80px) o header sempre aparece", () => {
  const r = enquadrarBloco({ ...base, topoDoBloco: 150 });
  assert.deepEqual(r, { destino: 0, headerVisivel: true, cabe: true });
});
