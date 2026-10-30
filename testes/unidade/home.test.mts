// Imagens da home editadas no painel (29/10/2026, src/lib/site/home.ts):
// link do banner, ordem, banner inativo, padrão sem imagem e permissão.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { decidirAcessoAoPainel, papelPodeExecutar } from "../../src/lib/auth/papeis.ts";
import { SLIDES_DO_BANNER } from "../../src/lib/site/banners.ts";
import {
  MENSAGEM_CELULAR_SEM_COMPUTADOR,
  MENSAGEM_PONTO_DE_FOCO_INVALIDO,
  POSICAO_DO_PONTO_DE_FOCO,
  bannerMuitoLargo,
  camposAlteradosDoBanner,
  camposAlteradosDoEspaco,
  imagemDoEspaco,
  lerBannerDoFormulario,
  lerConfiguracaoDaHome,
  lerImagemDoEspacoDoFormulario,
  midiasDaHome,
  nomeDoBanner,
  posicionarBanner,
  slidesDaHome,
  validarLinkDoBanner,
  versaoRecusada,
  type BannerDaHome,
} from "../../src/lib/site/home.ts";
import type { ImagemNaTela } from "../../src/lib/midia/tela.ts";

const IMAGEM: ImagemNaTela = { alt: "Alt da biblioteca", largura: 1920, altura: 800, variantes: [{ largura: 1600, url: "https://exemplo.invalid/a.webp" }] };
const banner = (chave: string, ordem: number, extra: Partial<BannerDaHome> = {}): BannerDaHome => ({ chave, ordem, midiaId: `m${ordem}`, midiaMobileId: null, alt: "", href: "", ativo: true, pontoDeFoco: "centro", midiaTabletId: null, titulo: "", trechoEmDestaque: "", subtitulo: "", textoDoBotao: "", posicaoDoTexto: "esquerda", ...extra });

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
    assert.deepEqual(lerConfiguracaoDaHome(undefined), { banners: [], imagens: {}, video: null });
    assert.deepEqual(lerConfiguracaoDaHome({ banners: "x", imagens: 3 }), { banners: [], imagens: {}, video: null });
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
    assert.deepEqual(lida.imagens, { "secao-mutiroes": { midiaId: "m9", midiaMobileId: null, alt: "Mutirão" } });
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
    assert.deepEqual(lerBannerDoFormulario(base), { ok: true, dados: { chave: "banner-aaaa1111", midiaId: "m1", midiaMobileId: null, midiaTabletId: null, alt: "Banner", href: "/loja", ativo: true, posicao: 1, pontoDeFoco: "centro", titulo: "", trechoEmDestaque: "", subtitulo: "", textoDoBotao: "", posicaoDoTexto: "esquerda" } });
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
    assert.deepEqual(lerImagemDoEspacoDoFormulario({ identificador: "secao-mutiroes", midiaId: "m1", alt: "Mutirão" }), { ok: true, identificador: "secao-mutiroes", imagem: { midiaId: "m1", midiaMobileId: null, alt: "Mutirão" } });
    assert.deepEqual(lerImagemDoEspacoDoFormulario({ identificador: "secao-mutiroes", midiaId: "", alt: "sobra" }), { ok: true, identificador: "secao-mutiroes", imagem: { midiaId: null, midiaMobileId: null, alt: "" } });
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

describe("Versão para celular (30/10/2026)", () => {
  const CELULAR: ImagemNaTela = { ...IMAGEM, largura: 1080, altura: 1350 };
  const base = { chave: "banner-aaaa1111", midiaId: "m1", alt: "Banner", href: "", ativo: "sim", posicao: "1" };

  test("documento sem midiaMobileId continua valendo (sem versão celular)", () => {
    const lida = lerConfiguracaoDaHome({
      banners: [{ chave: "banner-aaaa", ordem: 1, midiaId: "m1", alt: "A", href: "", ativo: true }],
      imagens: { "secao-mutiroes": { midiaId: "m2", alt: "Mutirão" } },
    });
    assert.equal(lida.banners[0].midiaMobileId, null);
    assert.equal(lida.imagens["secao-mutiroes"]?.midiaMobileId, null);
    const [slide] = slidesDaHome(lida, new Map([["m1", IMAGEM]]));
    assert.equal(slide.midia?.celular, null);
    assert.equal(imagemDoEspaco(lida, "secao-mutiroes", new Map([["m2", IMAGEM]]))?.celular, null);
  });

  test("com midiaMobileId: o site recebe as duas; celular fora da biblioteca, só a de computador", () => {
    const lida = lerConfiguracaoDaHome({
      banners: [{ chave: "banner-aaaa", ordem: 1, midiaId: "m1", midiaMobileId: "c1", alt: "A", href: "", ativo: true }],
      imagens: { "secao-faca-parte": { midiaId: "m2", midiaMobileId: "c2", alt: "Chamada" } },
    });
    assert.deepEqual(midiasDaHome(lida).sort(), ["c1", "c2", "m1", "m2"]);
    const imagens = new Map([["m1", IMAGEM], ["c1", CELULAR], ["m2", IMAGEM]]);
    assert.equal(slidesDaHome(lida, imagens)[0].midia?.celular?.altura, 1350);
    const espaco = imagemDoEspaco(lida, "secao-faca-parte", imagens);
    assert.equal(espaco?.alt, "Chamada");
    assert.equal(espaco?.celular, null, "c2 não está na biblioteca: fica só a de computador");
  });

  test("leitura: celular sem computador, ou id inválido, não vale", () => {
    const lida = lerConfiguracaoDaHome({
      banners: [
        { chave: "banner-aaaa", ordem: 1, midiaId: null, midiaMobileId: "c1", alt: "", href: "", ativo: false },
        { chave: "banner-bbbb", ordem: 2, midiaId: "m1", midiaMobileId: "a/b", alt: "", href: "", ativo: false },
      ],
    });
    assert.deepEqual(lida.banners.map((item) => item.midiaMobileId), [null, null]);
  });

  test("formulário: com e sem versão celular; celular sozinho e id inválido recusados", () => {
    const comCelular = lerBannerDoFormulario({ ...base, midiaMobileId: "c1" });
    assert.ok(comCelular.ok && comCelular.dados.midiaMobileId === "c1");
    const semCelular = lerBannerDoFormulario({ ...base, midiaMobileId: "" });
    assert.ok(semCelular.ok && semCelular.dados.midiaMobileId === null);
    const sozinho = lerBannerDoFormulario({ ...base, midiaId: "", ativo: null, alt: "", midiaMobileId: "c1" });
    assert.ok(!sozinho.ok);
    assert.equal(sozinho.erros.midiaMobileId, MENSAGEM_CELULAR_SEM_COMPUTADOR);
    const invalido = lerImagemDoEspacoDoFormulario({ identificador: "secao-mutiroes", midiaId: "m1", midiaMobileId: "a/b", alt: "x" });
    assert.ok(!invalido.ok && invalido.erros.midiaMobileId);
    assert.deepEqual(lerImagemDoEspacoDoFormulario({ identificador: "secao-mutiroes", midiaId: "m1", midiaMobileId: "c1", alt: "x" }), {
      ok: true,
      identificador: "secao-mutiroes",
      imagem: { midiaId: "m1", midiaMobileId: "c1", alt: "x" },
    });
  });

  test("validador do servidor: mídia inexistente ou inativa recusada, pelo campo; a já gravada pode ficar", async () => {
    const ativas = new Set(["m1", "c1"]);
    const disponivel = async (id: string) => ativas.has(id);
    assert.equal(await versaoRecusada({ midiaId: "m1", midiaMobileId: null }, null, disponivel), null);
    assert.equal(await versaoRecusada({ midiaId: "m1", midiaMobileId: "c1" }, null, disponivel), null);
    assert.equal(await versaoRecusada({ midiaId: "m1", midiaMobileId: "inexistente" }, null, disponivel), "midiaMobileId");
    assert.equal(await versaoRecusada({ midiaId: "naLixeira", midiaMobileId: "c1" }, null, disponivel), "midiaId");
    assert.equal(await versaoRecusada({ midiaId: "m1", midiaMobileId: "naLixeira" }, { midiaId: "m1", midiaMobileId: "naLixeira" }, disponivel), null);
  });

  test("campos alterados citam a versão celular, sem valores", () => {
    const antes = banner("banner-aaaa", 1);
    assert.deepEqual(camposAlteradosDoBanner(antes, { ...antes, midiaMobileId: "c1" }), ["imagem para celular"]);
    assert.deepEqual(camposAlteradosDoEspaco({ midiaId: "m1", midiaMobileId: "c1", alt: "x" }, { midiaId: "m1", midiaMobileId: null, alt: "x" }), ["imagem para celular"]);
    assert.deepEqual(camposAlteradosDoEspaco(null, { midiaId: "m1", midiaMobileId: null, alt: "x" }), ["imagem", "texto alternativo"]);
  });
});

describe("Ponto de foco do banner (30/10/2026)", () => {
  const base = { chave: "banner-aaaa1111", midiaId: "m1", alt: "Banner", href: "", ativo: "sim", posicao: "1" };

  test("formulário: esquerda, centro e direita valem; ausente vale o centro", () => {
    for (const ponto of ["esquerda", "centro", "direita"]) {
      const lido = lerBannerDoFormulario({ ...base, pontoDeFoco: ponto });
      assert.ok(lido.ok && lido.dados.pontoDeFoco === ponto, ponto);
    }
    const ausente = lerBannerDoFormulario(base);
    assert.ok(ausente.ok && ausente.dados.pontoDeFoco === "centro");
  });

  test("formulário: valor inválido recusado com mensagem em português", () => {
    for (const ponto of ["cima", "", "Esquerda", "50% 50%"]) {
      const lido = lerBannerDoFormulario({ ...base, pontoDeFoco: ponto });
      assert.ok(!lido.ok, ponto);
      assert.equal(lido.erros.pontoDeFoco, MENSAGEM_PONTO_DE_FOCO_INVALIDO);
    }
  });

  test("leitura: documento antigo ou valor estranho valem o centro; o site recebe o ponto de foco", () => {
    const lida = lerConfiguracaoDaHome({
      banners: [
        { chave: "banner-aaaa", ordem: 1, midiaId: "m1", alt: "A", href: "", ativo: true },
        { chave: "banner-bbbb", ordem: 2, midiaId: "m2", alt: "B", href: "", ativo: true, pontoDeFoco: "direita" },
        { chave: "banner-cccc", ordem: 3, midiaId: "m3", alt: "C", href: "", ativo: true, pontoDeFoco: "topo" },
      ],
    });
    assert.deepEqual(lida.banners.map((item) => item.pontoDeFoco), ["centro", "direita", "centro"]);
    const slides = slidesDaHome(lida, new Map([["m1", IMAGEM], ["m2", IMAGEM], ["m3", IMAGEM]]));
    assert.deepEqual(slides.map((slide) => slide.pontoDeFoco), ["centro", "direita", "centro"]);
    assert.deepEqual(POSICAO_DO_PONTO_DE_FOCO, { esquerda: "0% 50%", centro: "50% 50%", direita: "100% 50%" });
  });

  test("alterar o ponto de foco entra no registro, sem valores", () => {
    const antes = banner("banner-aaaa", 1);
    assert.deepEqual(camposAlteradosDoBanner(antes, { ...antes, pontoDeFoco: "esquerda" }), ["ponto de foco"]);
  });

  test("aviso de imagem larga: só bem mais larga que 16:9 e com medidas", () => {
    assert.equal(bannerMuitoLargo({ largura: 2000, altura: 900 }), true);
    assert.equal(bannerMuitoLargo({ largura: 1920, altura: 1080 }), false);
    assert.equal(bannerMuitoLargo({ largura: 1920, altura: 800 }), true);
    assert.equal(bannerMuitoLargo({ largura: 2000, altura: 1000 }), false, "2:1 ainda não avisa");
    assert.equal(bannerMuitoLargo(null), false);
    assert.equal(bannerMuitoLargo({ largura: 0, altura: 0 }), false);
  });
});

describe("Ações da home: sessão e papel", () => {
  test("toda ação exportada começa por exigirPapelDoPainel(\"home.editar\")", async () => {
    const { readFileSync } = await import("node:fs");
    const codigo = readFileSync("src/app/admin/acoes-home.ts", "utf8");
    const acoes = [...codigo.matchAll(/export async function (\w+)\([^)]*(?:\{[^}]*\})?[^)]*\)[^{]*\{\s*([^\n]*)/g)].map(([, nome, primeira]) => ({ nome, primeira }));
    assert.deepEqual(acoes.map((acao) => acao.nome), ["salvarBannerDaHome", "excluirBannerDaHome", "salvarImagemDaSecao", "prepararEnvioDoVideoDaHome", "confirmarEnvioDoVideoDaHome", "salvarVideoDaHome", "prepararEnvioRetomavelDaHome", "gerarCapaDoYoutubeDaHome"]);
    for (const acao of acoes) assert.match(acao.primeira, /^(?:const usuario = )?await exigirPapelDoPainel\("home\.editar"\);$/, acao.nome);
  });
});
