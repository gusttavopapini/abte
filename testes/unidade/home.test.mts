// Imagens da home editadas no painel (29/10/2026, src/lib/site/home.ts):
// link do banner, ordem, banner inativo, padrão sem imagem e permissão.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { decidirAcessoAoPainel, papelPodeExecutar } from "../../src/lib/auth/papeis.ts";
import { SLIDES_DO_BANNER } from "../../src/lib/site/banners.ts";
import {
  camposAlteradosDoBanner,
  imagemDoEspaco,
  lerBannerDoFormulario,
  lerConfiguracaoDaHome,
  lerImagemDoEspacoDoFormulario,
  midiasDaHome,
  nomeDoBanner,
  posicionarBanner,
  slidesDaHome,
  validarLinkDoBanner,
  type BannerDaHome,
} from "../../src/lib/site/home.ts";
import type { ImagemNaTela } from "../../src/lib/midia/tela.ts";

const IMAGEM: ImagemNaTela = { alt: "Alt da biblioteca", largura: 1920, altura: 800, variantes: [{ largura: 1600, url: "https://exemplo.invalid/a.webp" }] };
const banner = (chave: string, ordem: number, extra: Partial<BannerDaHome> = {}): BannerDaHome => ({ chave, ordem, midiaId: `m${ordem}`, alt: "", href: "", ativo: true, ...extra });

describe("Link do banner", () => {
  test("vazio, caminho interno e https valem", () => {
    assert.deepEqual(validarLinkDoBanner(""), { ok: true, href: "" });
    assert.deepEqual(validarLinkDoBanner("  /loja  "), { ok: true, href: "/loja" });
    assert.deepEqual(validarLinkDoBanner("/blog/um-post?x=1#y"), { ok: true, href: "/blog/um-post?x=1#y" });
    assert.deepEqual(validarLinkDoBanner("https://www.exemplo.org/pagina"), { ok: true, href: "https://www.exemplo.org/pagina" });
  });

  test("javascript:, data:, http:, //, barra invertida, espaços e inválidos são recusados", () => {
    for (const ruim of ["javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html,oi", "http://exemplo.org", "//exemplo.org", "/\\exemplo.org", "/com espaço", "https://", "https://localhost/x", "loja", "mailto:a@b.c", `/${"a".repeat(2050)}`]) {
      assert.equal(validarLinkDoBanner(ruim).ok, false, ruim);
    }
    const recusado = validarLinkDoBanner("javascript:alert(1)");
    assert.ok(!recusado.ok && /começando com \//.test(recusado.mensagem));
  });
});

describe("Ordem e nomes dos banners", () => {
  test("posicionar leva à posição pedida e renumera de 1 em diante", () => {
    const lista = [banner("banner-aaaa", 1), banner("banner-bbbb", 2), banner("banner-cccc", 3)];
    assert.deepEqual(posicionarBanner(lista, "banner-cccc", 1).map((item) => [item.chave, item.ordem]), [["banner-cccc", 1], ["banner-aaaa", 2], ["banner-bbbb", 3]]);
    assert.deepEqual(posicionarBanner(lista, "banner-aaaa", 99).map((item) => item.chave), ["banner-bbbb", "banner-cccc", "banner-aaaa"]);
    assert.deepEqual(posicionarBanner(lista, "banner-bbbb", 0).map((item) => item.chave), ["banner-bbbb", "banner-aaaa", "banner-cccc"]);
  });

  test("nomes ordinais", () => {
    assert.equal(nomeDoBanner(1), "Primeiro banner");
    assert.equal(nomeDoBanner(3), "Terceiro banner");
    assert.equal(nomeDoBanner(8), "Oitavo banner");
  });

  test("campos alterados, sem valores", () => {
    const antes = banner("banner-aaaa", 1, { href: "/loja" });
    assert.deepEqual(camposAlteradosDoBanner(antes, { ...antes, href: "/blog", ativo: false }), ["link", "ativo"]);
    assert.deepEqual(camposAlteradosDoBanner(antes, antes), []);
    assert.equal(camposAlteradosDoBanner(null, antes).length, 5);
  });
});

describe("Leitura do documento e o site", () => {
  test("documento estranho ou vazio: nada, e o site usa o padrão", () => {
    assert.deepEqual(lerConfiguracaoDaHome(undefined), { banners: [], imagens: {} });
    assert.deepEqual(lerConfiguracaoDaHome({ banners: "x", imagens: 3 }), { banners: [], imagens: {} });
    assert.equal(slidesDaHome(null, new Map()), SLIDES_DO_BANNER);
    assert.equal(imagemDoEspaco(null, "secao-mutiroes", new Map()), null);
  });

  test("leitura descarta chave inválida, repetida, link perigoso e espaço desconhecido", () => {
    const lida = lerConfiguracaoDaHome({
      banners: [
        { chave: "banner-bbbb", ordem: 2, midiaId: "m2", alt: " B ", href: "javascript:alert(1)", ativo: true },
        { chave: "banner-aaaa", ordem: 1, midiaId: "m1", alt: "A", href: "/loja", ativo: false },
        { chave: "banner-aaaa", ordem: 3, midiaId: "m3", alt: "repetido", href: "", ativo: true },
        { chave: "Banner 4", ordem: 4, midiaId: "m4", alt: "", href: "", ativo: true },
      ],
      imagens: { "secao-mutiroes": { midiaId: "m9", alt: "Mutirão" }, outra: { midiaId: "m8", alt: "x" } },
    });
    assert.deepEqual(lida.banners.map((item) => [item.chave, item.ordem, item.href, item.alt]), [["banner-aaaa", 1, "/loja", "A"], ["banner-bbbb", 2, "", "B"]]);
    assert.deepEqual(lida.imagens, { "secao-mutiroes": { midiaId: "m9", alt: "Mutirão" } });
    assert.deepEqual(midiasDaHome(lida).sort(), ["m1", "m2", "m9"]);
  });

  test("site: só banners ativos com imagem disponível, na ordem; sem nenhum, o padrão", () => {
    const configuracao = lerConfiguracaoDaHome({
      banners: [
        { chave: "banner-aaaa", ordem: 2, midiaId: "m1", alt: "Primeiro alt", href: "/loja", ativo: true },
        { chave: "banner-bbbb", ordem: 1, midiaId: "m2", alt: "", href: "", ativo: true },
        { chave: "banner-cccc", ordem: 3, midiaId: "m3", alt: "Inativo", href: "", ativo: false },
        { chave: "banner-dddd", ordem: 4, midiaId: "sumiu", alt: "Fora da biblioteca", href: "", ativo: true },
      ],
    });
    const imagens = new Map([["m1", IMAGEM], ["m2", IMAGEM], ["m3", IMAGEM]]);
    const slides = slidesDaHome(configuracao, imagens);
    assert.deepEqual(slides.map((slide) => [slide.alt, slide.href]), [["Alt da biblioteca", ""], ["Primeiro alt", "/loja"]]);
    assert.ok(slides.every((slide) => slide.midia));
    assert.equal(slidesDaHome(lerConfiguracaoDaHome({ banners: [{ chave: "banner-cccc", ordem: 1, midiaId: "m3", alt: "", href: "", ativo: false }] }), imagens), SLIDES_DO_BANNER);
  });

  test("imagem do espaço: a escolhida, com o alt da home; sem ela, null (placeholder)", () => {
    const configuracao = lerConfiguracaoDaHome({ imagens: { "secao-faca-parte": { midiaId: "m1", alt: "Chamada" } } });
    assert.equal(imagemDoEspaco(configuracao, "secao-faca-parte", new Map([["m1", IMAGEM]]))?.alt, "Chamada");
    assert.equal(imagemDoEspaco(configuracao, "secao-faca-parte", new Map()), null);
    assert.equal(imagemDoEspaco(configuracao, "secao-mutiroes", new Map([["m1", IMAGEM]])), null);
  });
});

describe("Formulários da home", () => {
  const base = { chave: "banner-aaaa1111", midiaId: "m1", alt: "Banner", href: "/loja", ativo: "sim", posicao: "1" };

  test("banner válido", () => {
    assert.deepEqual(lerBannerDoFormulario(base), { ok: true, dados: { chave: "banner-aaaa1111", midiaId: "m1", alt: "Banner", href: "/loja", ativo: true, posicao: 1 } });
  });

  test("erros por campo, em português", () => {
    const lido = lerBannerDoFormulario({ ...base, alt: " ", href: "javascript:x", posicao: "9" });
    assert.ok(!lido.ok);
    assert.deepEqual(Object.keys(lido.erros).sort(), ["alt", "href", "posicao"]);
    const semImagem = lerBannerDoFormulario({ ...base, midiaId: "" });
    assert.ok(!semImagem.ok && semImagem.erros.midiaId?.startsWith("Um banner ativo precisa de imagem"));
    assert.ok(lerBannerDoFormulario({ ...base, midiaId: "", ativo: null, alt: "" }).ok, "inativo pode ficar sem imagem");
    assert.equal(lerBannerDoFormulario({ ...base, chave: "x" }).ok, false);
  });

  test("imagem do espaço: alt obrigatório com imagem; sem imagem, volta ao padrão", () => {
    assert.deepEqual(lerImagemDoEspacoDoFormulario({ identificador: "secao-mutiroes", midiaId: "m1", alt: "Mutirão" }), { ok: true, identificador: "secao-mutiroes", imagem: { midiaId: "m1", alt: "Mutirão" } });
    assert.deepEqual(lerImagemDoEspacoDoFormulario({ identificador: "secao-mutiroes", midiaId: "", alt: "sobra" }), { ok: true, identificador: "secao-mutiroes", imagem: { midiaId: null, alt: "" } });
    assert.equal(lerImagemDoEspacoDoFormulario({ identificador: "secao-mutiroes", midiaId: "m1", alt: "" }).ok, false);
    assert.equal(lerImagemDoEspacoDoFormulario({ identificador: "outra", midiaId: "m1", alt: "x" }).ok, false);
  });

  test("editar a home: administrador e editor; sem sessão ou papel, não", () => {
    assert.equal(papelPodeExecutar("administrador", "home.editar"), true);
    assert.equal(papelPodeExecutar("editor", "home.editar"), true);
    assert.deepEqual(decidirAcessoAoPainel(null, "home.editar"), { permitido: false, motivo: "sem-sessao" });
    assert.deepEqual(decidirAcessoAoPainel({}, "home.editar"), { permitido: false, motivo: "sem-papel" });
  });
});

describe("Ações da home: sessão e papel", () => {
  test("toda ação exportada começa por exigirPapelDoPainel(\"home.editar\")", async () => {
    const { readFileSync } = await import("node:fs");
    const codigo = readFileSync("src/app/admin/acoes-home.ts", "utf8");
    const acoes = [...codigo.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{\s*([^\n]*)/g)].map(([, nome, primeira]) => ({ nome, primeira }));
    assert.deepEqual(acoes.map((acao) => acao.nome), ["salvarBannerDaHome", "excluirBannerDaHome", "salvarImagemDaSecao"]);
    for (const acao of acoes) assert.match(acao.primeira, /^const usuario = await exigirPapelDoPainel\("home\.editar"\);$/, acao.nome);
  });
});
