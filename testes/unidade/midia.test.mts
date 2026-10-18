// Testes da biblioteca de mídia sem Firebase (npm run test:unidade): regras
// puras e processamento das imagens com o sharp. As imagens de teste são
// geradas aqui mesmo, sem pessoas e sem arquivos externos.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import sharp from "sharp";
import { prepararVariantes } from "../../src/lib/midia/biblioteca.ts";
import {
  LIMITE_DO_ARQUIVO_EM_BYTES,
  MENSAGENS,
  SAIDA_DO_NAVEGADOR,
  caminhoDaVariante,
  conferirCopiaReduzida,
  detectarFormato,
  escolherLarguras,
  escolherVariante,
  mensagemDoFormato,
  urlPublica,
  validarAlt,
  validarAvisoDeMenor,
} from "../../src/lib/midia/regras.ts";

// Imagem de duas cores: metade esquerda vermelha, metade direita azul.
async function duasCores(largura: number, altura: number) {
  const metade = Math.floor(largura / 2);
  return sharp({ create: { width: largura, height: altura, channels: 3, background: { r: 0, g: 0, b: 255 } } })
    .composite([{ input: { create: { width: metade, height: altura, channels: 3, background: { r: 255, g: 0, b: 0 } } }, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

async function corNoPonto(imagem: Buffer, x: number, y: number) {
  const { data, info } = await sharp(imagem).raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

describe("Tipo real do arquivo", () => {
  test("reconhece JPEG, PNG e WebP pelos primeiros bytes", async () => {
    const base = sharp({ create: { width: 10, height: 10, channels: 3, background: "white" } });
    assert.equal(detectarFormato(await base.clone().jpeg().toBuffer()), "jpeg");
    assert.equal(detectarFormato(await base.clone().png().toBuffer()), "png");
    assert.equal(detectarFormato(await base.clone().webp().toBuffer()), "webp");
  });

  test("recusa SVG, HEIC e texto com mensagem em português", () => {
    const svg = new TextEncoder().encode('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    assert.equal(mensagemDoFormato(detectarFormato(svg)), MENSAGENS.svg);
    const heic = new Uint8Array([0, 0, 0, 24, ...new TextEncoder().encode("ftypheic"), 0, 0, 0, 0]);
    assert.equal(mensagemDoFormato(detectarFormato(heic)), MENSAGENS.heic);
    const texto = new TextEncoder().encode("isto é um texto com extensão .jpg");
    assert.equal(mensagemDoFormato(detectarFormato(texto)), MENSAGENS.outroFormato);
  });

  test("um texto qualquer não passa no processamento, nem com nome de imagem", async () => {
    const resultado = await prepararVariantes(new TextEncoder().encode("não sou imagem"));
    assert.deepEqual(resultado, { ok: false, mensagem: MENSAGENS.outroFormato, campo: "arquivo" });
  });

  // O nome e o tipo informados pelo navegador não contam: só os bytes.
  test("arquivo de texto renomeado para .jpg é recusado pelo tipo real", async () => {
    const falso = new File(["Ata da reunião, só texto.\n"], "foto.jpg", { type: "image/jpeg" });
    const bytes = new Uint8Array(await falso.arrayBuffer());
    assert.equal(detectarFormato(bytes), "outro");
    assert.deepEqual(await prepararVariantes(bytes), { ok: false, mensagem: MENSAGENS.outroFormato, campo: "arquivo" });
  });

  test("PDF renomeado para .png é recusado pelo tipo real", async () => {
    const pdf = "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n";
    const falso = new File([pdf], "imagem.png", { type: "image/png" });
    const bytes = new Uint8Array(await falso.arrayBuffer());
    assert.equal(detectarFormato(bytes), "outro");
    assert.deepEqual(await prepararVariantes(bytes), { ok: false, mensagem: MENSAGENS.outroFormato, campo: "arquivo" });
  });

  test("JPEG corrompido: mensagem em português, sem texto técnico", async () => {
    const corrompido = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...Array.from({ length: 200 }, (_, i) => (i * 37) % 256)]);
    const resultado = await prepararVariantes(corrompido);
    assert.equal(resultado.ok, false);
    if (!resultado.ok) assert.ok(([MENSAGENS.ilegivel, MENSAGENS.outroFormato] as string[]).includes(resultado.mensagem), resultado.mensagem);
  });

  test("acima do limite: recusa antes de abrir, com a mensagem dos 4 MB", async () => {
    const resultado = await prepararVariantes(new Uint8Array(LIMITE_DO_ARQUIVO_EM_BYTES + 1));
    assert.deepEqual(resultado, { ok: false, mensagem: MENSAGENS.grande, campo: "arquivo" });
    assert.match(MENSAGENS.grande, /4 MB/);
  });
});

describe("Cópia reduzida no navegador", () => {
  test("sai em JPEG de qualidade alta, não em WebP", () => {
    assert.equal(SAIDA_DO_NAVEGADOR.tipo, "image/jpeg");
    assert.equal(SAIDA_DO_NAVEGADOR.extensao, "jpg");
    assert.ok(SAIDA_DO_NAVEGADOR.qualidade >= 0.9 && SAIDA_DO_NAVEGADOR.qualidade <= 1);
  });

  test("navegador que devolve PNG ou WebP no lugar do JPEG: recusa sem enviar", () => {
    assert.equal(conferirCopiaReduzida("image/jpeg", 1000), null);
    assert.equal(conferirCopiaReduzida("image/png", 1000), MENSAGENS.ilegivel);
    assert.equal(conferirCopiaReduzida("image/webp", 1000), MENSAGENS.ilegivel);
  });

  test("cópia acima do limite: mensagem dos 4 MB", () => {
    assert.equal(conferirCopiaReduzida("image/jpeg", LIMITE_DO_ARQUIVO_EM_BYTES), null);
    assert.equal(conferirCopiaReduzida("image/jpeg", LIMITE_DO_ARQUIVO_EM_BYTES + 1), MENSAGENS.grande);
  });
});

describe("Larguras das variantes", () => {
  test("nunca amplia e, abaixo de 480 px, gera uma na largura original", () => {
    assert.deepEqual(escolherLarguras(300), [300]);
    assert.deepEqual(escolherLarguras(480), [480]);
    assert.deepEqual(escolherLarguras(1000), [480, 960]);
    assert.deepEqual(escolherLarguras(2560), [480, 960, 1600]);
  });

  test("escolhe a variante mais leve que cobre a largura pedida", () => {
    const variantes = [{ largura: 960 }, { largura: 480 }, { largura: 1600 }];
    assert.equal(escolherVariante(variantes, 300)?.largura, 480);
    assert.equal(escolherVariante(variantes, 481)?.largura, 960);
    assert.equal(escolherVariante(variantes, 3000)?.largura, 1600);
  });
});

describe("Processamento com o sharp", () => {
  test("gera WebP nas larguras certas, sem ampliar", async () => {
    const grande = await prepararVariantes(await duasCores(2000, 1000));
    assert.equal(grande.ok, true);
    if (!grande.ok) return;
    assert.deepEqual(grande.variantes.map((v) => [v.largura, v.altura]), [[480, 240], [960, 480], [1600, 800]]);
    for (const variante of grande.variantes) assert.equal(detectarFormato(variante.dados), "webp");

    const pequena = await prepararVariantes(await duasCores(300, 200));
    assert.equal(pequena.ok, true);
    if (pequena.ok) assert.deepEqual(pequena.variantes.map((v) => [v.largura, v.altura]), [[300, 200]]);
  });

  test("imagem rotacionada por EXIF sai em pé, com a rotação aplicada", async () => {
    // Gravada deitada (400 x 200) com orientação 6: deve ser exibida girada 90° no sentido horário (200 x 400).
    const deitada = await sharp(await duasCores(400, 200)).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    assert.equal((await sharp(deitada).metadata()).orientation, 6);
    const resultado = await prepararVariantes(deitada);
    assert.equal(resultado.ok, true);
    if (!resultado.ok) return;
    assert.deepEqual([resultado.largura, resultado.altura], [200, 400], "medidas já na orientação certa");
    const [variante] = resultado.variantes;
    assert.deepEqual([variante.largura, variante.altura], [200, 400], "a imagem sai em pé");
    // A metade esquerda (vermelha) vira a metade de cima.
    const cima = await corNoPonto(variante.dados, 100, 50);
    const baixo = await corNoPonto(variante.dados, 100, 350);
    assert.ok(cima.r > 200 && cima.b < 60, `em cima deveria ser vermelho: ${JSON.stringify(cima)}`);
    assert.ok(baixo.b > 200 && baixo.r < 60, `embaixo deveria ser azul: ${JSON.stringify(baixo)}`);
    assert.equal((await sharp(variante.dados).metadata()).orientation, undefined, "sem a marca de orientação");
  });

  test("remove EXIF e GPS", async () => {
    const comGps = await sharp(await duasCores(600, 400))
      .jpeg()
      .withExif({
        IFD0: { Copyright: "teste", Make: "Camera de teste" },
        IFD3: { GPSLatitudeRef: "S", GPSLatitude: "23/1 33/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "46/1 38/1 0/1" },
      })
      .toBuffer();
    assert.ok((await sharp(comGps).metadata()).exif, "a imagem de teste tem EXIF");
    const resultado = await prepararVariantes(comGps);
    assert.equal(resultado.ok, true);
    if (!resultado.ok) return;
    for (const variante of resultado.variantes) {
      const metadados = await sharp(variante.dados).metadata();
      assert.equal(metadados.exif, undefined, "sem EXIF");
      assert.equal(metadados.xmp, undefined, "sem XMP");
      assert.equal(metadados.icc, undefined, "sem perfil da câmera");
      assert.equal(Buffer.from(variante.dados).includes("GPS"), false, "nenhum rastro de GPS");
    }
  });
});

describe("Texto alternativo, aviso de menores e caminhos", () => {
  test("alt obrigatório, sem espaços sobrando, com limite", () => {
    assert.deepEqual(validarAlt("  Mão segurando   uma caneta "), { ok: true, alt: "Mão segurando uma caneta" });
    assert.equal(validarAlt("   ").ok, false);
    assert.equal(validarAlt(undefined).ok, false);
    assert.equal(validarAlt("a".repeat(201)).ok, false);
  });

  test("imagem com criança ou adolescente exige a confirmação de autorização", () => {
    assert.ok(validarAvisoDeMenor(true, false));
    assert.equal(validarAvisoDeMenor(true, true), null);
    assert.equal(validarAvisoDeMenor(false, false), null);
  });

  test("caminhos em publico/ e lixeira/ e endereço público com o caminho codificado", () => {
    assert.equal(caminhoDaVariante("publico", "abc", 960), "publico/midias/abc/960.webp");
    assert.equal(caminhoDaVariante("lixeira", "abc", 480), "lixeira/midias/abc/480.webp");
    assert.equal(urlPublica("abte-dev.firebasestorage.app", "publico/midias/abc/960.webp"), "https://firebasestorage.googleapis.com/v0/b/abte-dev.firebasestorage.app/o/publico%2Fmidias%2Fabc%2F960.webp?alt=media");
  });
});
