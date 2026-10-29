import assert from "node:assert/strict";
import { test } from "node:test";
import { VIDEO_QUEM_SOMOS, videoParaExibir } from "../../src/lib/site/video.ts";

const EMBED = "https://www.youtube-nocookie.com/embed/abcDEF12345";

test("o vídeo de Quem Somos começa vazio (nenhum vídeo inventado)", () => {
  assert.equal(VIDEO_QUEM_SOMOS, "");
  assert.equal(videoParaExibir(""), null);
  assert.equal(videoParaExibir("   "), null);
});

test("links do YouTube viram o endereço sem cookies", () => {
  for (const endereco of [
    "https://www.youtube.com/watch?v=abcDEF12345",
    "https://m.youtube.com/watch?v=abcDEF12345&t=10",
    "https://youtu.be/abcDEF12345",
    "https://www.youtube.com/shorts/abcDEF12345",
    "https://www.youtube.com/embed/abcDEF12345",
    "https://www.youtube-nocookie.com/embed/abcDEF12345",
  ]) {
    assert.deepEqual(videoParaExibir(endereco), { tipo: "youtube", endereco: EMBED }, endereco);
  }
});

test("link do YouTube sem id válido, http ou de outro host não vale", () => {
  assert.equal(videoParaExibir("https://www.youtube.com/watch?v=curto"), null);
  assert.equal(videoParaExibir("https://www.youtube.com/channel/abcDEF12345"), null);
  assert.equal(videoParaExibir("http://www.youtube.com/watch?v=abcDEF12345"), null);
  assert.equal(videoParaExibir("https://youtube.com.exemplo.invalid/watch?v=abcDEF12345"), null);
  assert.equal(videoParaExibir("javascript:alert(1)"), null);
});

test("arquivos .mp4 e .webm do site ou em https", () => {
  assert.deepEqual(videoParaExibir("/videos/quem-somos.mp4"), { tipo: "arquivo", endereco: "/videos/quem-somos.mp4" });
  assert.deepEqual(videoParaExibir("https://exemplo.invalid/a/video.WEBM"), { tipo: "arquivo", endereco: "https://exemplo.invalid/a/video.WEBM" });
  assert.equal(videoParaExibir("/videos/quem-somos.mov"), null);
  assert.equal(videoParaExibir("//exemplo.invalid/video.mp4"), null);
  assert.equal(videoParaExibir("http://exemplo.invalid/video.mp4"), null);
});
