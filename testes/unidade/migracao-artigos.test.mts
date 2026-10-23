// Testes das partes puras da migração dos artigos (npm run test:unidade):
// leitura dos artigos e dos PDFs do mapa e título provisório. Só dados
// fictícios.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MOTIVO_DO_PDF, lerArtigosDoMapa, tituloProvisorio } from "../../src/lib/migracao/artigos.ts";

const hex = (n: number) => n.toString(16).padStart(32, "0");
const IMAGEM = (n: number) => `7dce06_${hex(n)}~mv2.jpg`;
const PDF = (n: number) => `7dce06_${hex(n)}.pdf`;

describe("Migração dos artigos: partes puras", () => {
  test("lê os artigos em ordem e lista cada PDF (artigos e cartilhas) com o motivo", () => {
    const mapa = [
      JSON.stringify({ tipo: "artigo", chave: "artigo-2", imagem: IMAGEM(2) }),
      JSON.stringify({ tipo: "artigo", chave: "artigo-1", imagem: IMAGEM(1) }),
      JSON.stringify({ tipo: "artigosPdfs", obs: "x", pares: [["artigo-1", PDF(10), PDF(11)]] }),
      JSON.stringify({ tipo: "cartilhasPdfs", obs: "x", arquivos: [PDF(20)] }),
      JSON.stringify({ tipo: "post", slug: "outro" }),
      "",
    ].join("\n");
    const lido = lerArtigosDoMapa(mapa);
    assert.ok(lido.ok);
    assert.deepEqual(lido.artigos, [
      { chave: "artigo-1", numero: 1, imagemNoMapa: IMAGEM(1) },
      { chave: "artigo-2", numero: 2, imagemNoMapa: IMAGEM(2) },
    ]);
    assert.deepEqual(lido.pdfs, [
      { arquivo: PDF(10), grupo: "artigo", chave: "artigo-1", ordem: 1, motivo: MOTIVO_DO_PDF },
      { arquivo: PDF(11), grupo: "artigo", chave: "artigo-1", ordem: 2, motivo: MOTIVO_DO_PDF },
      { arquivo: PDF(20), grupo: "cartilha", chave: null, ordem: 1, motivo: MOTIVO_DO_PDF },
    ]);
    assert.equal(MOTIVO_DO_PDF, "modelo de PDF adiado");
  });

  test("recusa chave fora do formato, artigo repetido e PDF com endereço", () => {
    for (const linha of [
      { tipo: "artigo", chave: "meu-artigo" },
      { tipo: "artigosPdfs", pares: [["artigo-1", "https://exemplo.invalid/a.pdf"]] },
      { tipo: "cartilhasPdfs", arquivos: ["../a.pdf"] },
    ]) {
      assert.equal(lerArtigosDoMapa(JSON.stringify(linha)).ok, false, JSON.stringify(linha));
    }
    const repetido = [JSON.stringify({ tipo: "artigo", chave: "artigo-1" }), JSON.stringify({ tipo: "artigo", chave: "artigo-1" })].join("\n");
    assert.equal(lerArtigosDoMapa(repetido).ok, false);
    assert.equal(lerArtigosDoMapa("{quebrado").ok, false);
  });

  test("título provisório, sem inventar o título real", () => {
    assert.equal(tituloProvisorio({ numero: 3 }), "Título a confirmar (artigo 3)");
  });
});
