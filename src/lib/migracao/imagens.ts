// Migração das imagens do site antigo (etapa 6, degrau 1: só imagens, sem
// vínculo com os registros). Cada imagem é baixada uma vez, passa pelo mesmo
// processamento do painel (biblioteca.ts) e vira um documento em midias com
// a origem (só o id da mídia no Wix, nunca o endereço). Idempotente pela
// origem: uma imagem já importada não é baixada de novo.
//
// Sem "server-only" e com as dependências por parâmetro (Firestore, Storage e
// a função que baixa), para rodar no script (scripts/migrar-imagens.mts) e nos
// testes no emulador (testes/sessao/migracao-imagens.test.mts) com um
// servidor local no lugar do Wix.
import type { Firestore } from "firebase-admin/firestore";
import sharp from "sharp";
import { COLECAO_LOG, registrarNoLote } from "../log/alteracoes.ts";
import { COLECAO_MIDIAS, ajustarComoNoNavegador, importarImagem, listarUsos, type ServicosDeMidia } from "../midia/biblioteca.ts";
import { caminhoDaVariante, detectarFormato } from "../midia/regras.ts";
import { AUTOR_DA_MIGRACAO, type Modo } from "./execucao.ts";
import {
  contarImagensPorProduto,
  formatoPrevisto,
  montarAltProvisorio,
  previstoComoRecusado,
  type ImagemDeOrigem,
  type MapaParaAlt,
  type RegraDoAlt,
  type UsoDeOrigem,
} from "./imagensOrigem.ts";
import { ErroDeRede } from "./rede.ts";

export const SISTEMA_DE_ORIGEM = "wix";

// Origem fixa das mídias do Wix (o script cria o cliente de rede com ela).
export const ORIGEM_DAS_MIDIAS_DO_WIX = "https://static.wixstatic.com";

export function caminhoDaMidiaNoWix(midiaIdWix: string): string {
  return `/media/${midiaIdWix}`;
}

// Texto que nunca pode aparecer nos documentos, nos registros, nos arquivos
// gerados nem no relatório (o site novo não aponta para o Wix).
const ENDERECO_DO_WIX = /wixstatic|wix\.com/i;

export type Baixar = (caminho: string) => Promise<{ bytes: Uint8Array }>;

// Tipo pela assinatura, com GIF e AVIF nomeados (para o relatório).
export function formatoPelaAssinatura(bytes: Uint8Array): string {
  const formato = detectarFormato(bytes);
  if (formato !== "outro") return formato;
  const texto = (inicio: number, fim: number) => String.fromCharCode(...bytes.subarray(inicio, fim));
  if (texto(0, 6) === "GIF87a" || texto(0, 6) === "GIF89a") return "gif";
  if (texto(4, 8) === "ftyp" && ["avif", "avis"].includes(texto(8, 12))) return "avif";
  return "outro";
}

// Uso como aparece no relatório: tipo, papel e chave de origem. A chave dos
// profissionais é o nome em forma de slug, então fica de fora (o id do Wix
// basta para achar a imagem em imagens-origem.json).
function usoNoRelatorio(uso: UsoDeOrigem) {
  return uso.tipo === "profissional"
    ? { tipo: uso.tipo, papel: uso.papel, posicao: uso.posicao }
    : { tipo: uso.tipo, papel: uso.papel, chave: uso.chaveDeOrigem, posicao: uso.posicao };
}

type ItemDoPlano = {
  imagem: ImagemDeOrigem;
  alt: string;
  regra: RegraDoAlt;
  semDadoNoMapa: boolean;
};

function contar<T>(itens: T[], chave: (item: T) => string | string[]): Record<string, number> {
  const contagem: Record<string, number> = {};
  for (const item of itens) {
    const chaves = chave(item);
    for (const valor of Array.isArray(chaves) ? chaves : [chaves]) contagem[valor] = (contagem[valor] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(contagem).sort(([a], [b]) => a.localeCompare(b)));
}

export type RelatorioDeImagens = Awaited<ReturnType<typeof migrarImagens>>;

// Imagens já importadas, pelo id do Wix. As que alguém pôs na lixeira também
// contam como existentes (restaurar é decisão de uma pessoa; escolha aceita
// em 21/10/2026), e o relatório avisa quando isso acontece.
async function jaImportadas(db: Firestore): Promise<Map<string, { id: string; naLixeira: boolean }>> {
  const documentos = await db.collection(COLECAO_MIDIAS).where("origem.sistema", "==", SISTEMA_DE_ORIGEM).select("origem", "excluidoEm").get();
  const mapa = new Map<string, { id: string; naLixeira: boolean }>();
  for (const documento of documentos.docs) {
    const midiaId = documento.get("origem.midiaId");
    if (typeof midiaId === "string") mapa.set(midiaId, { id: documento.id, naLixeira: Boolean(documento.get("excluidoEm")) });
  }
  return mapa;
}

export async function migrarImagens(opcoes: {
  servicos: ServicosDeMidia;
  imagens: ImagemDeOrigem[];
  mapa: MapaParaAlt;
  modo: Modo;
  execucao: string;
  limite: number | null;
  tipo: string | null;
  baixar: Baixar;
  aoProgredir?: (feitas: number, total: number) => void;
}) {
  const { servicos, imagens, mapa, modo, execucao, limite, tipo, baixar, aoProgredir } = opcoes;
  const iniciadoEm = new Date().toISOString();
  const porProduto = contarImagensPorProduto(imagens);
  const plano: ItemDoPlano[] = imagens.map((imagem) => ({ imagem, ...montarAltProvisorio(imagem, mapa, porProduto) }));

  const existentes = await jaImportadas(servicos.db);
  const filtradas = tipo ? plano.filter((item) => item.imagem.usos.some((uso) => uso.tipo === tipo)) : plano;
  const jaExistentes = filtradas.filter((item) => existentes.has(item.imagem.midiaIdWix));
  const existentesNaLixeira = jaExistentes
    .map((item) => ({ midiaIdWix: item.imagem.midiaIdWix, ...(existentes.get(item.imagem.midiaIdWix) as { id: string; naLixeira: boolean }) }))
    .filter((item) => item.naLixeira)
    .map((item) => ({ midiaIdWix: item.midiaIdWix, midiaId: item.id }));
  const candidatas = filtradas.filter((item) => !existentes.has(item.imagem.midiaIdWix));
  const nestaExecucao = limite === null ? candidatas : candidatas.slice(0, limite);

  const recusadas: { midiaIdWix: string; formato: string; previsto: boolean; usos: ReturnType<typeof usoNoRelatorio>[] }[] = [];
  const falhas: { midiaIdWix: string; motivo: string }[] = [];
  const migradas: { midiaIdWix: string; midiaId: string; regraDoAlt: RegraDoAlt; reduzida: boolean }[] = [];
  let baixadas = 0;
  let interrompido: string | null = null;

  if (modo === "simulacao") {
    // Nada é baixado: a recusa por tipo é prevista pela extensão do id.
    for (const item of nestaExecucao.filter((item) => previstoComoRecusado(item.imagem.midiaIdWix))) {
      recusadas.push({ midiaIdWix: item.imagem.midiaIdWix, formato: formatoPrevisto(item.imagem.midiaIdWix), previsto: true, usos: item.imagem.usos.map(usoNoRelatorio) });
    }
  } else {
    let feitas = 0;
    for (const item of nestaExecucao) {
      const id = item.imagem.midiaIdWix;
      try {
        const { bytes } = await baixar(caminhoDaMidiaNoWix(id));
        baixadas++;
        const formato = formatoPelaAssinatura(bytes);
        if (formato !== "jpeg" && formato !== "png" && formato !== "webp") {
          recusadas.push({ midiaIdWix: id, formato, previsto: false, usos: item.imagem.usos.map(usoNoRelatorio) });
        } else {
          const ajuste = await ajustarComoNoNavegador(bytes);
          if (!ajuste.ok) falhas.push({ midiaIdWix: id, motivo: ajuste.mensagem });
          else {
            const resultado = await importarImagem(
              servicos,
              { bytes: ajuste.bytes, alt: item.alt, origem: { sistema: SISTEMA_DE_ORIGEM, midiaId: id, execucao } },
              AUTOR_DA_MIGRACAO,
            );
            if (resultado.ok) migradas.push({ midiaIdWix: id, midiaId: resultado.id, regraDoAlt: item.regra, reduzida: ajuste.reduzida });
            else falhas.push({ midiaIdWix: id, motivo: resultado.mensagem });
          }
        }
      } catch (erro) {
        if (erro instanceof ErroDeRede && erro.tipo === "bloqueio") {
          interrompido = `${erro.message} Execução interrompida; nada foi contornado.`;
          falhas.push({ midiaIdWix: id, motivo: erro.message });
          break;
        }
        falhas.push({ midiaIdWix: id, motivo: erro instanceof ErroDeRede ? erro.message : `Falha inesperada: ${erro instanceof Error ? erro.message : String(erro)}` });
      }
      aoProgredir?.(++feitas, nestaExecucao.length);
    }
  }

  const verificacao = modo === "executar" ? await verificarExecucao(servicos, execucao) : null;
  const previstasRecusadas = filtradas.filter((item) => previstoComoRecusado(item.imagem.midiaIdWix));
  const relatorio = {
    script: "migrar-imagens",
    execucao,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    filtroDeTipo: tipo,
    limite,
    contagens: {
      encontradas: imagens.length,
      usos: imagens.reduce((soma, imagem) => soma + imagem.usos.length, 0),
      usosPorTipo: contar(imagens.flatMap((imagem) => imagem.usos), (uso) => uso.tipo),
      imagensPorTipoDeUso: contar(imagens, (imagem) => [...new Set(imagem.usos.map((uso) => uso.tipo))]),
      porPrioridade: contar(imagens, (imagem) => imagem.prioridade ?? "sem prioridade"),
      porFormatoPrevisto: contar(imagens, (imagem) => formatoPrevisto(imagem.midiaIdWix)),
      porRegraDoAlt: contar(plano, (item) => item.regra),
      previstasAceitas: filtradas.length - previstasRecusadas.length,
      previstasRecusadas: previstasRecusadas.length,
      filtradasPeloTipo: filtradas.length,
      jaExistentes: jaExistentes.length,
      jaExistentesNaLixeira: existentesNaLixeira.length,
      candidatas: candidatas.length,
      nestaExecucao: nestaExecucao.length,
      baixadas,
      migradas: migradas.length,
      reduzidas: migradas.filter((item) => item.reduzida).length,
      recusadasPeloTipo: recusadas.length,
      falhas: falhas.length,
    },
    // Toda imagem importada entra com conferência de menores pendente e alt provisório.
    conferenciaDeMenorPendente: modo === "executar" ? migradas.length : nestaExecucao.length - recusadas.length,
    altsProvisorios: {
      semDadoNoMapa: plano.filter((item) => item.semDadoNoMapa).map((item) => item.imagem.midiaIdWix),
      genericos: plano.filter((item) => item.regra === "paginaGenerica").map((item) => item.imagem.midiaIdWix),
    },
    imagensComUsosDeTiposDiferentes: contar(
      imagens.filter((imagem) => new Set(imagem.usos.map((uso) => uso.tipo)).size > 1),
      (imagem) => [...new Set(imagem.usos.map((uso) => uso.tipo))].sort().join(" + "),
    ),
    // Aviso: já importadas, mas na lixeira. Não são importadas de novo; para
    // voltarem ao site, alguém restaura no painel (/admin/midia).
    existentesNaLixeira,
    recusadas,
    falhas,
    migradas,
    interrompido,
    verificacao,
    // Simulação: o que seria importado, pelo id do Wix e pela regra do alt.
    previstas: modo === "simulacao" ? nestaExecucao.map((item) => ({ midiaIdWix: item.imagem.midiaIdWix, regraDoAlt: item.regra })) : [],
  };
  return relatorio;
}

// Conferência automática no fim de uma execução: nenhum documento nem
// registro da execução contém endereço do Wix, e cada variante gravada,
// relida do bucket, não contém esse texto nem metadados (EXIF, XMP, IPTC).
export async function verificarExecucao({ db, bucket }: ServicosDeMidia, execucao: string) {
  const problemas: string[] = [];
  const documentos = await db.collection(COLECAO_MIDIAS).where("origem.execucao", "==", execucao).get();
  const registros = await db.collection(COLECAO_LOG).where("execucao", "==", execucao).get();
  for (const documento of [...documentos.docs, ...registros.docs]) {
    if (ENDERECO_DO_WIX.test(JSON.stringify(documento.data()))) problemas.push(`${documento.ref.parent.id}/${documento.id}: contém endereço do Wix.`);
  }
  let variantes = 0;
  for (const documento of documentos.docs) {
    const lista = documento.get("variantes");
    for (const variante of Array.isArray(lista) ? lista : []) {
      variantes++;
      const [bytes] = await bucket.file(String(variante.caminho)).download();
      if (ENDERECO_DO_WIX.test(bytes.toString("latin1"))) problemas.push(`${variante.caminho}: contém endereço do Wix.`);
      const metadados = await sharp(bytes).metadata();
      if (metadados.exif || metadados.xmp || metadados.iptc) problemas.push(`${variante.caminho}: tem metadados (EXIF, XMP ou IPTC).`);
    }
  }
  return { documentos: documentos.size, registros: registros.size, variantes, problemas };
}

// Desfaz uma execução: só documentos com origem.execucao igual à indicada
// (envios pelo painel não têm origem e nunca entram). Pula a imagem em uso
// por algum registro e a que uma pessoa alterou depois (registro sem origem
// "migracao"). Com incluirEditadas, as alteradas por pessoa também saem, mas
// só se confirmacaoDeEditadas for igual à quantidade delas (mostrada antes,
// na simulação); senão nada é apagado. Apaga os arquivos (publico/ e
// lixeira/) e o documento; o registro de alterações fica, com a reversão.
export async function desfazerExecucao(opcoes: {
  servicos: ServicosDeMidia;
  execucaoAlvo: string;
  execucao: string;
  modo: Modo;
  incluirEditadas: boolean;
  confirmacaoDeEditadas?: number | null;
}) {
  const { servicos, execucaoAlvo, execucao, modo, incluirEditadas, confirmacaoDeEditadas = null } = opcoes;
  const { db, bucket } = servicos;
  const iniciadoEm = new Date().toISOString();
  const documentos = await db.collection(COLECAO_MIDIAS).where("origem.execucao", "==", execucaoAlvo).get();
  const puladas: { midiaId: string; motivo: string }[] = [];
  const aDesfazer: { documento: (typeof documentos.docs)[number]; editadaPorPessoa: boolean }[] = [];

  // Primeiro decide tudo; só depois apaga.
  for (const documento of documentos.docs) {
    const usos = await listarUsos(db, documento.id);
    if (usos.length > 0) {
      const registros = usos.reduce((soma, uso) => soma + uso.registros.length, 0);
      puladas.push({ midiaId: documento.id, motivo: `em uso (${registros} registro(s))` });
      continue;
    }
    const historico = await db.collection(COLECAO_LOG).where("documentoId", "==", documento.id).get();
    const editadaPorPessoa = historico.docs.some((registro) => registro.get("origem") !== "migracao");
    if (editadaPorPessoa && !incluirEditadas) {
      puladas.push({ midiaId: documento.id, motivo: "alterada por uma pessoa depois da importação" });
      continue;
    }
    aDesfazer.push({ documento, editadaPorPessoa });
  }
  const editadasQueSairiam = aDesfazer.filter((item) => item.editadaPorPessoa).length;
  const bloqueado =
    modo === "executar" && incluirEditadas && confirmacaoDeEditadas !== editadasQueSairiam
      ? `Nada foi apagado: ${editadasQueSairiam} imagem(ns) alterada(s) por uma pessoa sairiam. Para confirmar, repita com --confirmo-apagar-editadas=${editadasQueSairiam}.`
      : null;

  if (modo === "executar" && !bloqueado) {
    for (const { documento } of aDesfazer) {
      const lista = documento.get("variantes");
      const larguras = (Array.isArray(lista) ? lista : []).map((variante) => Number(variante.largura));
      for (const largura of larguras) {
        for (const pasta of ["publico", "lixeira"] as const) await bucket.file(caminhoDaVariante(pasta, documento.id, largura)).delete({ ignoreNotFound: true });
      }
      const lote = db.batch();
      lote.delete(documento.ref);
      registrarNoLote(db, lote, AUTOR_DA_MIGRACAO, {
        colecao: COLECAO_MIDIAS,
        documentoId: documento.id,
        acao: "excluir_definitivo",
        campos: [],
        resumo: `Importação desfeita (execução ${execucaoAlvo}).`,
        origem: "migracao",
        execucao,
      });
      await lote.commit();
    }
  }
  const desfeitas = bloqueado ? [] : aDesfazer.map((item) => item.documento.id);

  return {
    script: "migrar-imagens (desfazer)",
    execucao,
    execucaoDesfeita: execucaoAlvo,
    modo,
    iniciadoEm,
    terminadoEm: new Date().toISOString(),
    bloqueado,
    contagens: { encontradas: documentos.size, desfeitas: desfeitas.length, puladas: puladas.length, editadasPorPessoaQueSairiam: editadasQueSairiam },
    desfeitas,
    puladas,
  };
}

// O relatório só tem ids, contagens e motivos; esta conferência garante que
// nenhum endereço do Wix entrou nele.
export function relatorioSemEnderecoDoWix(relatorio: unknown): boolean {
  return !ENDERECO_DO_WIX.test(JSON.stringify(relatorio));
}

function tabela(titulo: string, contagem: Record<string, number>): string {
  const linhas = Object.entries(contagem).map(([chave, valor]) => `| ${chave} | ${valor} |`);
  return [`| ${titulo} | Quantidade |`, "|---|---|", ...linhas].join("\n");
}

// Relatório em Markdown, para leitura (o JSON tem as listas completas).
export function relatorioEmMarkdown(relatorio: RelatorioDeImagens, projeto: string): string {
  const c = relatorio.contagens;
  const recusadas = relatorio.recusadas.map(
    (item) =>
      `| ${item.midiaIdWix} | ${item.formato}${item.previsto ? " (previsto pela extensão)" : ""} | ${item.usos.map((uso) => [uso.tipo, "chave" in uso ? uso.chave : null].filter(Boolean).join(": ")).join("; ")} |`,
  );
  const falhas = relatorio.falhas.map((item) => `| ${item.midiaIdWix} | ${item.motivo} |`);
  return [
    `# Migração das imagens: ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
    "",
    `- Execução: ${relatorio.execucao}`,
    `- Projeto: ${projeto}`,
    `- Início: ${relatorio.iniciadoEm}; fim: ${relatorio.terminadoEm}`,
    `- Filtro de tipo: ${relatorio.filtroDeTipo ?? "nenhum"}; limite: ${relatorio.limite ?? "nenhum"}`,
    relatorio.interrompido ? `- **INTERROMPIDA:** ${relatorio.interrompido}` : "- Interrompida: não",
    "",
    "## Contagens",
    "",
    "| Item | Quantidade |",
    "|---|---|",
    `| Imagens encontradas no arquivo | ${c.encontradas} |`,
    `| Usos | ${c.usos} |`,
    `| Previstas aceitas (pela extensão) | ${c.previstasAceitas} |`,
    `| Previstas recusadas (pela extensão) | ${c.previstasRecusadas} |`,
    `| Já existentes (mesma origem) | ${c.jaExistentes} |`,
    `| Já existentes, mas na lixeira | ${c.jaExistentesNaLixeira} |`,
    `| Candidatas | ${c.candidatas} |`,
    `| Nesta execução (depois do limite) | ${c.nestaExecucao} |`,
    `| Baixadas | ${c.baixadas} |`,
    `| Migradas | ${c.migradas} |`,
    `| Reduzidas como no navegador | ${c.reduzidas} |`,
    `| Recusadas pelo tipo | ${c.recusadasPeloTipo} |`,
    `| Falhas | ${c.falhas} |`,
    `| Conferência de menores pendente | ${relatorio.conferenciaDeMenorPendente} |`,
    "",
    tabela("Usos por tipo", c.usosPorTipo),
    "",
    tabela("Imagens por tipo de uso (uma imagem conta em cada tipo que tem)", c.imagensPorTipoDeUso),
    "",
    tabela("Prioridade", c.porPrioridade),
    "",
    tabela("Formato previsto pela extensão", c.porFormatoPrevisto),
    "",
    tabela("Regra do alt provisório", c.porRegraDoAlt),
    "",
    tabela("Imagens com usos de tipos diferentes (importadas uma vez só)", relatorio.imagensComUsosDeTiposDiferentes),
    "",
    `Alts sem título ou nome no mapa (usaram a chave): ${relatorio.altsProvisorios.semDadoNoMapa.length}. Alts genéricos: ${relatorio.altsProvisorios.genericos.length}.`,
    "",
    "## Já importadas, mas na lixeira",
    "",
    relatorio.existentesNaLixeira.length
      ? [
          "**Aviso:** estas imagens já foram importadas e alguém as pôs na lixeira. Não são importadas de novo; para voltarem ao site, restaure em /admin/midia.",
          "",
          "| Id no Wix | Id em midias |",
          "|---|---|",
          ...relatorio.existentesNaLixeira.map((item) => `| ${item.midiaIdWix} | ${item.midiaId} |`),
        ].join("\n")
      : "Nenhuma.",
    "",
    "## Recusadas pelo tipo",
    "",
    recusadas.length ? ["| Id no Wix | Tipo | Usos |", "|---|---|---|", ...recusadas].join("\n") : "Nenhuma.",
    "",
    "## Falhas",
    "",
    falhas.length ? ["| Id no Wix | Motivo |", "|---|---|", ...falhas].join("\n") : "Nenhuma.",
    "",
    "## Verificação automática",
    "",
    relatorio.verificacao
      ? `Documentos: ${relatorio.verificacao.documentos}; registros: ${relatorio.verificacao.registros}; variantes relidas: ${relatorio.verificacao.variantes}; problemas: ${relatorio.verificacao.problemas.length}.${relatorio.verificacao.problemas.map((problema) => `\n- ${problema}`).join("")}`
      : "Não se aplica (simulação: nada foi gravado).",
    "",
  ].join("\n");
}
