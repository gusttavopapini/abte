// Legenda do vídeo de "Quem Somos" servida pelo próprio site (08/11/2026):
// só o id da pasta (20 letras e números) e só o caminho fixo da legenda.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { caminhoDaLegendaPeloId, enderecoDaLegenda, ehCaminhoDoArquivo } from "../../src/lib/site/videoQuemSomos.ts";

const ID = "dnFfRkulJsyF9Yq4Vimq";

describe("Rota da legenda", () => {
  test("id válido vira o caminho da legenda, que o envio do painel também aceita", () => {
    const caminho = caminhoDaLegendaPeloId(ID);
    assert.equal(caminho, `publico/videos/${ID}/legenda.vtt`);
    assert.equal(ehCaminhoDoArquivo("legenda", caminho), true);
  });

  test("id fora do formato não vira caminho", () => {
    for (const id of [
      "",
      "curto",
      `${ID}x`,
      ID.slice(1),
      "../../../../segredo.t",
      "dnFfRkulJsyF9Yq4Vim/",
      "dnFfRkulJsyF9Yq4Vim.",
      "dnFfRkulJsyF9Yq4Vim%",
      "dnFfRkulJsyF9Yq4Vimç",
      `${ID}\n`,
      null,
      undefined,
      123,
      ["a"],
    ]) {
      assert.equal(caminhoDaLegendaPeloId(id), null, String(id));
    }
  });

  test("endereço da legenda no site a partir do caminho gravado", () => {
    assert.equal(enderecoDaLegenda(`publico/videos/${ID}/legenda.vtt`), `/api/legenda/${ID}`);
    assert.equal(caminhoDaLegendaPeloId(enderecoDaLegenda(`publico/videos/${ID}/legenda.vtt`)?.split("/").pop()), `publico/videos/${ID}/legenda.vtt`);
  });

  test("caminho que não é de legenda não vira endereço", () => {
    for (const caminho of [
      `publico/videos/${ID}/video.mp4`,
      `publico/videos/${ID}/outra.vtt`,
      `publico/midias/${ID}/legenda.vtt`,
      `lixeira/videos/${ID}/legenda.vtt`,
      `publico/videos/../${ID}/legenda.vtt`,
      "https://exemplo.invalid/legenda.vtt",
      "",
      null,
    ]) {
      assert.equal(enderecoDaLegenda(caminho), null, String(caminho));
    }
  });
});
