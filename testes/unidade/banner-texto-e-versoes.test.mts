// Banners da home com três versões e texto em código (30/10/2026):
// validadores, cadeia de substituição, trecho em destaque, link e leitura de
// documentos antigos.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { fontesPorFaixa } from "../../src/lib/midia/versoes.ts";
import type { ImagemNaTela } from "../../src/lib/midia/tela.ts";
import {
  MENSAGEM_TABLET_SEM_COMPUTADOR,
  camposAlteradosDoBanner,
  lerBannerDoFormulario,
  lerConfiguracaoDaHome,
  midiasDaHome,
  partesDoTitulo,
  slidesDaHome,
  temTextoNoBanner,
  versaoRecusada,
} from "../../src/lib/site/home.ts";

const imagem = (largura: number, altura: number): ImagemNaTela => ({ alt: "x", largura, altura, variantes: [{ largura: 960, url: `https://exemplo.invalid/${largura}.webp` }] });
const PC = imagem(1920, 1080);
const TABLET = imagem(1536, 2048);
const CELULAR = imagem(1080, 1920);
const base = { chave: "banner-aaaa1111", midiaId: "m1", alt: "Banner", href: "/loja", ativo: "sim", posicao: "1" };

describe("Cadeia de substituição das versões", () => {
  test("celular usa tablet e depois computador; tablet usa computador", () => {
    assert.deepEqual(fontesPorFaixa({ celular: CELULAR, tablet: TABLET }), { celular: CELULAR, tablet: TABLET });
    assert.deepEqual(fontesPorFaixa({ celular: null, tablet: TABLET }), { celular: TABLET, tablet: TABLET });
    assert.deepEqual(fontesPorFaixa({ celular: CELULAR, tablet: null }), { celular: CELULAR, tablet: null });
    assert.deepEqual(fontesPorFaixa({}), { celular: null, tablet: null }, "sem as duas: só a de computador");
    assert.deepEqual(fontesPorFaixa({ tablet: { ...TABLET, variantes: [] } }), { celular: null, tablet: null }, "versão sem variantes não vale");
  });

  test("leitura: documento antigo sem midiaTabletId continua valendo; o site recebe as três", () => {
    const antigo = lerConfiguracaoDaHome({ banners: [{ chave: "banner-aaaa", ordem: 1, midiaId: "m1", alt: "A", href: "", ativo: true }] });
    assert.equal(antigo.banners[0].midiaTabletId, null);
    const novo = lerConfiguracaoDaHome({ banners: [{ chave: "banner-aaaa", ordem: 1, midiaId: "m1", midiaTabletId: "t1", midiaMobileId: "c1", alt: "A", href: "", ativo: true }] });
    assert.deepEqual(midiasDaHome(novo).sort(), ["c1", "m1", "t1"]);
    const [slide] = slidesDaHome(novo, new Map([["m1", PC], ["t1", TABLET], ["c1", CELULAR]]));
    assert.equal(slide.midia?.tablet?.altura, 2048);
    assert.equal(slide.midia?.celular?.altura, 1920);
  });

  test("tablet sem computador recusado; mídia de tablet inexistente recusada pelo campo", async () => {
    const sozinho = lerBannerDoFormulario({ ...base, midiaId: "", ativo: null, alt: "", midiaTabletId: "t1" });
    assert.ok(!sozinho.ok);
    assert.equal(sozinho.erros.midiaTabletId, MENSAGEM_TABLET_SEM_COMPUTADOR);
    assert.equal(await versaoRecusada({ midiaId: "m1", midiaMobileId: null, midiaTabletId: "nao-existe" }, null, async (id) => id === "m1"), "midiaTabletId");
  });
});

describe("Texto e botão do banner", () => {
  test("formulário: campos válidos; sem texto, banner só de imagem", () => {
    const lido = lerBannerDoFormulario({ ...base, titulo: "Conhecimento que transforma", trechoEmDestaque: "que transforma", subtitulo: "Subtítulo", textoDoBotao: "Saiba mais", posicaoDoTexto: "direita" });
    assert.ok(lido.ok);
    assert.deepEqual([lido.dados.titulo, lido.dados.trechoEmDestaque, lido.dados.textoDoBotao, lido.dados.posicaoDoTexto], ["Conhecimento que transforma", "que transforma", "Saiba mais", "direita"]);
    const vazio = lerBannerDoFormulario(base);
    assert.ok(vazio.ok && !temTextoNoBanner(vazio.dados) && vazio.dados.posicaoDoTexto === "esquerda");
  });

  test("limites, trecho fora do título, botão sem link e posição inválida", () => {
    const lido = lerBannerDoFormulario({ ...base, href: "", titulo: "x".repeat(91), trechoEmDestaque: "outra coisa", subtitulo: "y".repeat(201), textoDoBotao: "Botão", posicaoDoTexto: "topo" });
    assert.ok(!lido.ok);
    assert.deepEqual(Object.keys(lido.erros).sort(), ["posicaoDoTexto", "subtitulo", "textoDoBotao", "titulo", "trechoEmDestaque"]);
    const longo = lerBannerDoFormulario({ ...base, textoDoBotao: "z".repeat(31) });
    assert.ok(!longo.ok && longo.erros.textoDoBotao?.includes("30"));
  });

  test("trecho em destaque: a primeira ocorrência no título; fora dele, sem destaque", () => {
    assert.deepEqual(partesDoTitulo("Conhecimento que transforma a abordagem", "que transforma"), [
      { texto: "Conhecimento ", destaque: false },
      { texto: "que transforma", destaque: true },
      { texto: " a abordagem", destaque: false },
    ]);
    assert.deepEqual(partesDoTitulo("Título", "outro"), [{ texto: "Título", destaque: false }]);
    assert.deepEqual(partesDoTitulo("", ""), []);
    const lida = lerConfiguracaoDaHome({ banners: [{ chave: "banner-aaaa", ordem: 1, midiaId: "m1", alt: "A", href: "", ativo: true, titulo: "Título", trechoEmDestaque: "fora" }] });
    assert.equal(lida.banners[0].trechoEmDestaque, "", "leitura descarta trecho fora do título");
  });

  test("link: sem link o botão não aparece; Artigos fora do site tira link e botão", () => {
    const configuracao = lerConfiguracaoDaHome({
      banners: [
        { chave: "banner-aaaa", ordem: 1, midiaId: "m1", alt: "A", href: "/artigos", ativo: true, titulo: "T", textoDoBotao: "Ver" },
        { chave: "banner-bbbb", ordem: 2, midiaId: "m1", alt: "B", href: "", ativo: true, titulo: "T", textoDoBotao: "Ver" },
      ],
    });
    const [comArtigos, semLink] = slidesDaHome(configuracao, new Map([["m1", PC]]), true);
    assert.equal(comArtigos.texto?.textoDoBotao, "Ver");
    assert.equal(semLink.texto?.textoDoBotao, "", "sem link, o botão não aparece");
    const [semArtigos] = slidesDaHome(configuracao, new Map([["m1", PC]]), false);
    assert.deepEqual([semArtigos.href, semArtigos.texto?.textoDoBotao], ["", ""]);
    assert.equal(slidesDaHome(lerConfiguracaoDaHome({ banners: [{ chave: "banner-cccc", ordem: 1, midiaId: "m1", alt: "C", href: "", ativo: true }] }), new Map([["m1", PC]]))[0].texto, null, "banner antigo: só a imagem");
  });

  test("registro cita o texto e o tablet, sem valores", () => {
    const antes = lerConfiguracaoDaHome({ banners: [{ chave: "banner-aaaa", ordem: 1, midiaId: "m1", alt: "A", href: "", ativo: true }] }).banners[0];
    assert.deepEqual(camposAlteradosDoBanner(antes, { ...antes, midiaTabletId: "t1", titulo: "Novo", posicaoDoTexto: "centro" }), ["imagem para tablet", "título", "posição do texto"]);
  });
});
