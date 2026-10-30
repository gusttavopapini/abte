// Vídeo de "Quem Somos" (30/10/2026, src/lib/site/videoQuemSomos.ts): link
// do YouTube, tipo e tamanho, política de envio, legenda e formulário.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { idDoYoutubeDoLink } from "../../src/lib/site/video.ts";
import {
  LIMITE_DO_VIDEO_EM_BYTES,
  camposAlteradosDoVideo,
  caminhoDoEnvio,
  condicoesDoEnvio,
  conferirMetadados,
  ehCaminhoDoArquivo,
  legendaValida,
  lerVideoDoFormulario,
  lerVideoQuemSomos,
  validarPedidoDeEnvio,
} from "../../src/lib/site/videoQuemSomos.ts";

const ID = "abcdefghij0123456789";
const vazio = { forma: "youtube", youtube: "", caminho: "", contentType: "", tamanho: "", descricao: "", capaMidiaId: "", legendaCaminho: "", indicaMenor: null, autorizacao: null };

describe("Link do YouTube", () => {
  test("youtube.com, youtu.be, shorts e embed; só https; id de 11 caracteres", () => {
    for (const link of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ", "https://youtube.com/shorts/dQw4w9WgXcQ", "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=3"]) {
      assert.equal(idDoYoutubeDoLink(link), "dQw4w9WgXcQ", link);
    }
    for (const link of ["http://youtu.be/dQw4w9WgXcQ", "https://vimeo.com/123", "https://youtube.com.exemplo.invalid/watch?v=dQw4w9WgXcQ", "https://youtu.be/curto", "nada"]) {
      assert.equal(idDoYoutubeDoLink(link), null, link);
    }
  });
});

describe("Envio do arquivo", () => {
  test("vídeo: MP4 ou WebM até 60 MB; legenda .vtt até 200 KB", () => {
    assert.ok(validarPedidoDeEnvio({ arquivo: "video", contentType: "video/mp4", tamanho: 1024 }).ok);
    assert.ok(validarPedidoDeEnvio({ arquivo: "video", contentType: "video/webm", tamanho: LIMITE_DO_VIDEO_EM_BYTES }).ok);
    assert.equal(validarPedidoDeEnvio({ arquivo: "video", contentType: "video/quicktime", tamanho: 10 }).ok, false);
    assert.equal(validarPedidoDeEnvio({ arquivo: "video", contentType: "video/mp4", tamanho: LIMITE_DO_VIDEO_EM_BYTES + 1 }).ok, false);
    assert.equal(validarPedidoDeEnvio({ arquivo: "video", contentType: "video/mp4", tamanho: 0 }).ok, false);
    assert.ok(validarPedidoDeEnvio({ arquivo: "legenda", contentType: "text/vtt", tamanho: 1000 }).ok);
    assert.equal(validarPedidoDeEnvio({ arquivo: "legenda", contentType: "text/vtt", tamanho: 200 * 1024 + 1 }).ok, false);
    assert.equal(validarPedidoDeEnvio({ arquivo: "legenda", contentType: "text/plain", tamanho: 10 }).ok, false);
    assert.equal(validarPedidoDeEnvio({ arquivo: "outro", contentType: "video/mp4", tamanho: 10 }).ok, false);
  });

  test("caminho próprio e condições da política (tamanho e tipo)", () => {
    assert.equal(caminhoDoEnvio("video", ID, "video/webm"), `publico/videos/${ID}/video.webm`);
    assert.equal(caminhoDoEnvio("legenda", ID, "text/vtt"), `publico/videos/${ID}/legenda.vtt`);
    assert.equal(ehCaminhoDoArquivo("video", `publico/videos/${ID}/video.mp4`), true);
    assert.equal(ehCaminhoDoArquivo("video", "publico/midias/x/960.webp"), false);
    assert.equal(ehCaminhoDoArquivo("legenda", `publico/videos/${ID}/../x.vtt`), false);
    assert.deepEqual(condicoesDoEnvio("video/mp4", 100), [["content-length-range", 1, 100], ["eq", "$Content-Type", "video/mp4"]]);
  });

  test("metadados reais conferidos; legenda precisa começar com WEBVTT", () => {
    assert.ok(conferirMetadados("video", { tamanho: 10, contentType: "video/mp4" }).ok);
    assert.equal(conferirMetadados("video", { tamanho: 10, contentType: "text/html" }).ok, false);
    assert.equal(conferirMetadados("video", { tamanho: LIMITE_DO_VIDEO_EM_BYTES + 1, contentType: "video/mp4" }).ok, false);
    assert.equal(conferirMetadados("legenda", { tamanho: 10, contentType: "video/mp4" }).ok, false);
    assert.equal(legendaValida("WEBVTT\n\n00:00.000 --> 00:01.000\nOlá"), true);
    assert.equal(legendaValida("﻿WEBVTT\r\n"), true);
    assert.equal(legendaValida("<script>"), false);
  });
});

describe("Formulário do vídeo", () => {
  test("descrição obrigatória e link do YouTube conferido", () => {
    const lido = lerVideoDoFormulario({ ...vazio, youtube: "https://youtu.be/dQw4w9WgXcQ" });
    assert.ok(!lido.ok && lido.erros.descricao);
    const ruim = lerVideoDoFormulario({ ...vazio, youtube: "https://vimeo.com/1", descricao: "Vídeo de teste" });
    assert.ok(!ruim.ok && ruim.erros.youtube);
    assert.deepEqual(lerVideoDoFormulario({ ...vazio, youtube: "https://youtu.be/dQw4w9WgXcQ", descricao: " Vídeo  de teste " }), {
      ok: true,
      video: { descricao: "Vídeo de teste", capaMidiaId: null, legendaCaminho: null, indicaMenor: false, tipo: "youtube", youtubeId: "dQw4w9WgXcQ" },
    });
  });

  test("arquivo exige o envio; aviso de menores exige a confirmação; nenhum remove", () => {
    const semArquivo = lerVideoDoFormulario({ ...vazio, forma: "arquivo", descricao: "x" });
    assert.ok(!semArquivo.ok && semArquivo.erros.caminho);
    const comArquivo = lerVideoDoFormulario({ ...vazio, forma: "arquivo", descricao: "x", caminho: `publico/videos/${ID}/video.mp4`, contentType: "video/mp4", tamanho: "10" });
    assert.ok(comArquivo.ok && comArquivo.video?.tipo === "arquivo");
    const semAutorizacao = lerVideoDoFormulario({ ...vazio, youtube: "https://youtu.be/dQw4w9WgXcQ", descricao: "x", indicaMenor: "sim" });
    assert.ok(!semAutorizacao.ok && semAutorizacao.erros.autorizacao);
    assert.deepEqual(lerVideoDoFormulario({ ...vazio, forma: "nenhum" }), { ok: true, video: null });
  });

  test("leitura tolerante e registro só com os nomes", () => {
    assert.equal(lerVideoQuemSomos({ tipo: "youtube", youtubeId: "dQw4w9WgXcQ" }), null, "sem descrição não vale");
    assert.equal(lerVideoQuemSomos({ tipo: "arquivo", caminho: "publico/midias/x", contentType: "video/mp4", descricao: "x" }), null);
    const video = lerVideoQuemSomos({ tipo: "youtube", youtubeId: "dQw4w9WgXcQ", descricao: "x" });
    assert.ok(video);
    assert.deepEqual(camposAlteradosDoVideo(null, video), ["vídeo", "descrição"]);
    assert.deepEqual(camposAlteradosDoVideo(video, null), ["vídeo removido"]);
  });
});
