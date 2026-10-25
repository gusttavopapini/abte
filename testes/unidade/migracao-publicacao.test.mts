// Testes das partes puras da publicação do conteúdo importado (npm run
// test:unidade): escolha do tipo, situação de cada documento, campos que a
// publicação grava e desfaz, avisos e decisão do desfazer. Só dados fictícios.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FieldValue } from "firebase-admin/firestore";
import { REGRAS_DE_PUBLICACAO, TIPOS_DE_PUBLICACAO, avisosDoDocumento, decidirDesfazer, lerTiposDePublicacao, situacaoNaPublicacao } from "../../src/lib/migracao/publicacao.ts";

const regra = (colecao: string) => {
  const encontrada = REGRAS_DE_PUBLICACAO.find((item) => item.colecao === colecao);
  assert.ok(encontrada);
  return encontrada;
};
const momento = (ms: number) => ({ toMillis: () => ms });

describe("Publicação do conteúdo importado: partes puras", () => {
  test("--tipo é obrigatório; aceita os tipos e todos", () => {
    assert.equal(lerTiposDePublicacao(null).ok, false);
    assert.equal(lerTiposDePublicacao("paginas").ok, false);
    assert.deepEqual(lerTiposDePublicacao("posts"), { ok: true, tipos: ["posts"] });
    assert.deepEqual(lerTiposDePublicacao("todos"), { ok: true, tipos: [...TIPOS_DE_PUBLICACAO] });
    assert.deepEqual(lerTiposDePublicacao("diretoria,profissionais"), { ok: true, tipos: ["profissionais", "diretoria"] });
    assert.equal(lerTiposDePublicacao("posts,paginas").ok, false);
    assert.equal(lerTiposDePublicacao("posts,todos").ok, false);
  });

  test("cada tipo tem regra; categorias cobre as de artigo e as de produto", () => {
    for (const tipo of TIPOS_DE_PUBLICACAO) assert.ok(REGRAS_DE_PUBLICACAO.some((item) => item.tipo === tipo), tipo);
    assert.deepEqual(REGRAS_DE_PUBLICACAO.filter((item) => item.tipo === "categorias").map((item) => item.colecao).sort(), ["categoriasDeArtigos", "categoriasDeProdutos"]);
  });

  test("situação: lixeira vence; já no ar; a publicar; categoria de produto sem campo", () => {
    assert.equal(situacaoNaPublicacao(regra("profissionais"), { ativo: false, excluidoEm: new Date() }), "naLixeira");
    assert.equal(situacaoNaPublicacao(regra("profissionais"), { ativo: true }), "jaNoAr");
    assert.equal(situacaoNaPublicacao(regra("profissionais"), { ativo: false }), "aPublicar");
    assert.equal(situacaoNaPublicacao(regra("produtos"), { publicado: false }), "aPublicar");
    assert.equal(situacaoNaPublicacao(regra("posts"), { status: "rascunho" }), "aPublicar");
    assert.equal(situacaoNaPublicacao(regra("posts"), { status: "publicado" }), "jaNoAr");
    assert.equal(situacaoNaPublicacao(regra("diretoria"), {}), "aPublicar", "diretoria sem o campo ativo está fora do site");
    assert.equal(situacaoNaPublicacao(regra("categoriasDeArtigos"), { ativa: false }), "aPublicar");
    assert.equal(situacaoNaPublicacao(regra("categoriasDeArtigos"), {}), "jaNoAr", "ausente vale ativa");
    assert.equal(situacaoNaPublicacao(regra("categoriasDeProdutos"), {}), "semCampo");
  });

  test("campos gravados: nunca atualizadoEm, conferenciaDeMenor nem revisarMigracao", () => {
    const agora = new Date("2026-10-24T12:00:00Z");
    assert.deepEqual(regra("profissionais").camposParaPublicar?.({}, agora), { ativo: true });
    assert.deepEqual(regra("produtos").camposParaPublicar?.({}, agora), { publicado: true });
    assert.deepEqual(regra("posts").camposParaPublicar?.({ publicadoEm: new Date("2020-01-01") }, agora), { status: "publicado" }, "publicadoEm original fica");
    assert.deepEqual(regra("artigos").camposParaPublicar?.({}, agora), { status: "publicado", publicadoEm: agora });
    assert.deepEqual(regra("artigos").camposParaPublicar?.({ publicadoEm: new Date("2020-01-01") }, agora), { status: "publicado" });
    assert.deepEqual(regra("diretoria").camposParaPublicar?.({}, agora), { ativo: true });
    assert.deepEqual(regra("categoriasDeArtigos").camposParaPublicar?.({}, agora), { ativa: true });
    for (const item of REGRAS_DE_PUBLICACAO) {
      const campos = Object.keys(item.camposParaPublicar?.({}, agora) ?? {});
      for (const proibido of ["atualizadoEm", "conferenciaDeMenor", "revisarMigracao"]) assert.ok(!campos.includes(proibido), `${item.colecao}: ${proibido}`);
    }
  });

  test("desfazer volta ao estado de antes; publicadoEm do artigo só sai se a publicação o gravou", () => {
    assert.deepEqual(regra("profissionais").camposParaDesfazer(["ativo"]), { ativo: false });
    assert.deepEqual(regra("produtos").camposParaDesfazer(["publicado"]), { publicado: false });
    assert.deepEqual(regra("posts").camposParaDesfazer(["status"]), { status: "rascunho" });
    assert.deepEqual(regra("artigos").camposParaDesfazer(["status"]), { status: "rascunho" });
    const comData = regra("artigos").camposParaDesfazer(["status", "publicadoEm"]);
    assert.equal(comData.status, "rascunho");
    assert.ok((comData.publicadoEm as FieldValue).isEqual(FieldValue.delete()));
    assert.deepEqual(regra("diretoria").camposParaDesfazer(["ativo"]), { ativo: false });
    assert.deepEqual(regra("categoriasDeArtigos").camposParaDesfazer(["ativa"]), { ativa: false });
  });

  test("avisos: sem imagem, imagem pendente no texto, título provisório", () => {
    assert.deepEqual(avisosDoDocumento("posts", { capaMidiaId: null, conteudo: "![x](midia:wix:7dce06_a~mv2.avif)", publicadoEm: new Date() }), ["semCapa", "imagemPendenteNoTexto"]);
    assert.deepEqual(avisosDoDocumento("posts", { capaMidiaId: "m1", conteudo: "![x](midia:m2)", publicadoEm: new Date() }), []);
    assert.deepEqual(avisosDoDocumento("artigos", { titulo: "Título a confirmar (artigo 3)", imagemMidiaId: "m", autores: "" }), ["tituloAConfirmar", "semAutores"]);
    assert.deepEqual(avisosDoDocumento("produtos", { imagens: [] }), ["semImagem"]);
    assert.deepEqual(avisosDoDocumento("diretoria", { fotoMidiaId: null }), ["semFoto"]);
  });

  test("decisão do desfazer: só o que continua no ar e ninguém alterou depois", () => {
    const posts = regra("posts");
    const publicadoEm = 1000;
    assert.deepEqual(decidirDesfazer({ regra: posts, dados: { status: "publicado", atualizadoEm: momento(500) }, publicadoEm, registrosDePessoaEm: [] }), { ok: true });
    assert.equal(decidirDesfazer({ regra: posts, dados: undefined, publicadoEm, registrosDePessoaEm: [] }).ok, false);
    assert.equal(decidirDesfazer({ regra: posts, dados: { status: "rascunho" }, publicadoEm, registrosDePessoaEm: [] }).ok, false);
    assert.equal(decidirDesfazer({ regra: posts, dados: { status: "publicado", atualizadoEm: momento(2000) }, publicadoEm, registrosDePessoaEm: [] }).ok, false, "editado no painel depois");
    assert.equal(decidirDesfazer({ regra: posts, dados: { status: "publicado" }, publicadoEm, registrosDePessoaEm: [1500] }).ok, false, "registro de pessoa depois");
    assert.deepEqual(decidirDesfazer({ regra: posts, dados: { status: "publicado" }, publicadoEm, registrosDePessoaEm: [500] }), { ok: true }, "registro de pessoa antes não impede");
  });
});
