"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { ImagemDoItem, type EscolhaDeImagem } from "@/app/admin/_componentes/ImagemDoItem/ImagemDoItem";
import { excluirBannerDaHome, salvarBannerDaHome, salvarImagemDaSecao, type RespostaDaHome } from "@/app/admin/acoes-home";
import { Botao } from "@/components/Botao/Botao";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { ConteudoDoSlide, type FormatoDaPrevia } from "@/components/Hero/ConteudoDoSlide";
import { Modal } from "@/components/Modal/Modal";
import type { SlideDoBanner } from "@/lib/site/banners";
import { ANCORAS_DA_HOME } from "@/lib/site/ancoras";
import { ehCaminhoDosArtigos } from "@/lib/site/configuracoes";
import type { CampoDoDono } from "@/lib/midia/dono";
import type { ImagemNaTela } from "@/lib/midia/tela";
import {
  AVISO_IMAGEM_LARGA,
  AVISO_IMAGEM_SEM_TEXTO,
  MENSAGEM_TEXTO_DO_BOTAO_COM_ENDERECO,
  PAGINAS_DO_SITE,
  textoDoBotaoPareceEndereco,
  validarLinkDoBanner,
  AVISO_VERSAO_FALTANDO,
  LIMITE_DO_SUBTITULO_DO_BANNER,
  LIMITE_DO_TEXTO_DO_BOTAO,
  LIMITE_DO_TITULO_DO_BANNER,
  POSICOES_DO_TEXTO,
  ROTULOS_DAS_POSICOES_DO_TEXTO,
  temTextoNoBanner,
  type PosicaoDoTexto,
  type ProporcaoRecomendada,
  AVISO_SEM_VERSAO_CELULAR,
  DICA_DO_BANNER,
  PONTOS_DE_FOCO,
  POSICAO_DO_PONTO_DE_FOCO,
  ROTULOS_DOS_PONTOS_DE_FOCO,
  bannerMuitoLargo,
  LIMITE_DE_BANNERS,
  LIMITE_DO_ALT_DA_HOME,
  LIMITE_DO_LINK,
  PROPORCOES_DO_BANNER,
  linkEhExterno,
  nomeDoBanner,
  type BannerDaHome,
  type CampoDoBanner,
  type IdentificadorDoEspaco,
  type PontoDeFoco,
  type ProporcoesDoEspaco,
} from "@/lib/site/home";
import type { VideoQuemSomos } from "@/lib/site/videoQuemSomos";
import estilos from "./HomeAdminClient.module.css";
import { VideoQuemSomosAdmin } from "./VideoQuemSomosAdmin";

export type BannerNaTela = BannerDaHome & { nome: string; imagem: ImagemNaTela | null; imagemCelular: ImagemNaTela | null; imagemTablet: ImagemNaTela | null };
export type EspacoNaTela = {
  identificador: IdentificadorDoEspaco;
  nome: string;
  onde: string;
  proporcoes: ProporcoesDoEspaco;
  midiaId: string | null;
  midiaMobileId: string | null;
  alt: string;
  imagem: ImagemNaTela | null;
  imagemCelular: ImagemNaTela | null;
};

type Janela = { tipo: "banner"; banner: BannerNaTela | null } | { tipo: "excluir"; banner: BannerNaTela } | { tipo: "espaco"; espaco: EspacoNaTela } | null;

// Chave de um banner novo (também o id do dono das imagens dele).
function novaChave(): string {
  return `banner-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function Miniatura({ imagem, vazio, razao }: { imagem: ImagemNaTela | null; vazio: string; razao: number }) {
  return (
    <div className={estilos.miniatura} style={{ "--razao": razao } as CSSProperties}>
      {imagem ? (
        <ImagemDaMidia variantes={imagem.variantes} alt="" largura={imagem.largura} altura={imagem.altura} sizes="(max-width: 767px) 45vw, 160px" className={estilos.imagem} />
      ) : (
        <span className={estilos.semImagem}>{vazio}</span>
      )}
    </div>
  );
}

// As miniaturas do cartão (30/10/2026), rotuladas, cada uma na proporção do
// espaço no site: computador e celular e, nos banners, também tablet.
function Miniaturas({
  proporcoes,
  midiaId,
  imagem,
  midiaMobileId,
  imagemCelular,
  tablet,
  vazio,
}: {
  proporcoes: ProporcoesDoEspaco & { tablet?: { razao: number } };
  midiaId: string | null;
  imagem: ImagemNaTela | null;
  midiaMobileId: string | null;
  imagemCelular: ImagemNaTela | null;
  tablet?: { midiaTabletId: string | null; imagem: ImagemNaTela | null };
  vazio: string;
}) {
  const foraDaBiblioteca = "Imagem fora da biblioteca";
  return (
    <div className={`${estilos.miniaturas} ${tablet ? estilos.tresMiniaturas : ""}`}>
      <figure className={estilos.versaoNoCartao}>
        <Miniatura imagem={imagem} vazio={midiaId ? foraDaBiblioteca : vazio} razao={proporcoes.computador.razao} />
        <figcaption className={estilos.legendaDaVersao}>Computador</figcaption>
      </figure>
      {tablet && proporcoes.tablet && (
        <figure className={estilos.versaoNoCartao}>
          <Miniatura imagem={tablet.imagem} vazio={tablet.midiaTabletId ? foraDaBiblioteca : midiaId ? "Usa a de computador" : vazio} razao={proporcoes.tablet.razao} />
          <figcaption className={estilos.legendaDaVersao}>Tablet</figcaption>
        </figure>
      )}
      <figure className={`${estilos.versaoNoCartao} ${estilos.versaoCelular}`}>
        <Miniatura imagem={imagemCelular} vazio={midiaMobileId ? foraDaBiblioteca : midiaId ? (tablet?.midiaTabletId ? "Usa a de tablet" : "Usa a de computador") : vazio} razao={proporcoes.celular.razao} />
        <figcaption className={estilos.legendaDaVersao}>Celular</figcaption>
      </figure>
    </div>
  );
}

type Versao = "computador" | "tablet" | "celular";
type EstadoDasVersoes = { computador: EscolhaDeImagem; celular: EscolhaDeImagem; tablet?: EscolhaDeImagem };

// Envio das versões no Modal (30/10/2026): "Versão para computador"
// (obrigatória para o espaço ter imagem), "Versão para celular" (opcional)
// e, nos banners, "Versão para tablet" (opcional), lado a lado (empilhadas
// até 767px), cada uma com o envio da Frente 2 e a prévia numa moldura com a
// proporção do site. Os ids vão nos campos escondidos midiaId, midiaTabletId
// e midiaMobileId.
function VersoesDaImagem({
  idDoDono,
  campos,
  proporcoes,
  inicial,
  erros,
  rotulo,
  aoMudar,
  pontoDeFoco,
  dica,
  avisarLarga,
}: {
  idDoDono: string;
  campos: { computador: CampoDoDono; celular: CampoDoDono; tablet?: CampoDoDono };
  proporcoes: ProporcoesDoEspaco & { tablet?: ProporcaoRecomendada };
  inicial: EstadoDasVersoes;
  erros: { midiaId?: string; midiaMobileId?: string; midiaTabletId?: string };
  rotulo: string;
  aoMudar: (versao: Versao, escolha: EscolhaDeImagem) => void;
  // Banners (30/10/2026): ponto de foco aplicado às prévias, dica de
  // composição e aviso de imagem bem mais larga que 16:9.
  pontoDeFoco?: PontoDeFoco;
  dica?: string;
  avisarLarga?: boolean;
}) {
  const comTablet = Boolean(campos.tablet && proporcoes.tablet);
  const [escolhas, setEscolhas] = useState<EstadoDasVersoes>(inicial);
  // As versões copiadas são remontadas com a imagem nova (o campo de envio
  // guarda a escolha dentro dele).
  const [copias, setCopias] = useState({ chave: 0, tablet: inicial.tablet ?? null, celular: inicial.celular });
  const [confirmarCopia, setConfirmarCopia] = useState(false);
  const [anuncio, setAnuncio] = useState("");
  const confirmarRef = useRef<HTMLButtonElement>(null);
  const copiarRef = useRef<HTMLButtonElement>(null);
  const alvos: Versao[] = comTablet ? ["tablet", "celular"] : ["celular"];

  useEffect(() => {
    if (confirmarCopia) confirmarRef.current?.focus();
  }, [confirmarCopia]);

  function mudar(versao: Versao, escolha: EscolhaDeImagem) {
    setEscolhas((atual) => ({ ...atual, [versao]: escolha }));
    setConfirmarCopia(false);
    aoMudar(versao, escolha);
  }

  function copiar() {
    const computador = escolhas.computador;
    if (!computador) return;
    setCopias((atual) => ({ chave: atual.chave + 1, tablet: comTablet ? computador : atual.tablet, celular: computador }));
    for (const versao of alvos) mudar(versao, computador);
    setConfirmarCopia(false);
    setAnuncio(`${comTablet ? "As versões para tablet e para celular usam" : "A versão para celular usa"} agora a mesma imagem da versão para computador. Ela vai para o site quando você salvar.`);
    copiarRef.current?.focus();
  }

  function pedirCopia() {
    // Com outra imagem já numa das versões, pede confirmação antes.
    if (alvos.some((versao) => escolhas[versao] && escolhas[versao]?.id !== escolhas.computador?.id)) setConfirmarCopia(true);
    else copiar();
  }

  const posicao = pontoDeFoco && POSICAO_DO_PONTO_DE_FOCO[pontoDeFoco];
  const todasIguais = Boolean(escolhas.computador && alvos.every((versao) => escolhas[versao]?.id === escolhas.computador?.id));
  const faltaAlguma = Boolean(escolhas.computador && alvos.some((versao) => !escolhas[versao]));
  const textoDoCopiar = comTablet ? "Usar a mesma imagem em todas as versões" : "Usar a mesma imagem nas duas versões";
  return (
    <div className={estilos.versoes}>
      {dica && <p className={estilos.ajuda}>{dica}</p>}
      <div className={`${estilos.areasDasVersoes} ${comTablet ? estilos.tresAreas : ""}`}>
        <ImagemDoItem
          nome="midiaId"
          rotulo={`Versão para computador (${rotulo})`}
          inicial={inicial.computador}
          dono={{ tipo: "home", id: idDoDono, campo: campos.computador }}
          proporcao={proporcoes.computador.texto}
          tamanho={proporcoes.computador.tamanho}
          moldura={{ razao: proporcoes.computador.razao, rotulo: "Prévia no computador", posicao }}
          erro={erros.midiaId}
          aoMudar={(escolha) => mudar("computador", escolha)}
        />
        {comTablet && campos.tablet && proporcoes.tablet && (
          <ImagemDoItem
            key={`tablet-${copias.chave}`}
            nome="midiaTabletId"
            rotulo={`Versão para tablet, opcional (${rotulo})`}
            inicial={copias.tablet}
            dono={{ tipo: "home", id: idDoDono, campo: campos.tablet }}
            proporcao={proporcoes.tablet.texto}
            tamanho={proporcoes.tablet.tamanho}
            moldura={{ razao: proporcoes.tablet.razao, estreita: true, rotulo: "Prévia no tablet", posicao }}
            erro={erros.midiaTabletId}
            aoMudar={(escolha) => mudar("tablet", escolha)}
          />
        )}
        <ImagemDoItem
          key={`celular-${copias.chave}`}
          nome="midiaMobileId"
          rotulo={`Versão para celular, opcional (${rotulo})`}
          inicial={copias.celular}
          dono={{ tipo: "home", id: idDoDono, campo: campos.celular }}
          proporcao={proporcoes.celular.texto}
          tamanho={proporcoes.celular.tamanho}
          moldura={{ razao: proporcoes.celular.razao, estreita: true, rotulo: "Prévia no celular", posicao }}
          erro={erros.midiaMobileId}
          aoMudar={(escolha) => mudar("celular", escolha)}
        />
      </div>

      {avisarLarga && bannerMuitoLargo(escolhas.computador?.imagem) && <CaixaDoPainel tipo="atencao">{AVISO_IMAGEM_LARGA}</CaixaDoPainel>}
      {faltaAlguma && (comTablet ? <CaixaDoPainel tipo="atencao">{AVISO_VERSAO_FALTANDO}</CaixaDoPainel> : <CaixaDoPainel tipo="informacao">{AVISO_SEM_VERSAO_CELULAR}</CaixaDoPainel>)}

      <div className={estilos.copiar}>
        <Botao ref={copiarRef} type="button" variante="secundario" onClick={pedirCopia} disabled={!escolhas.computador || todasIguais}>
          {textoDoCopiar}
        </Botao>
        <p className={estilos.ajuda}>
          {!escolhas.computador
            ? "Envie primeiro a versão para computador."
            : todasIguais
              ? "Todas as versões usam a mesma imagem."
              : `Copia a imagem de computador para ${comTablet ? "as versões tablet e celular" : "a versão celular"}.`}
        </p>
      </div>

      {confirmarCopia && (
        <CaixaDoPainel tipo="atencao" titulo={comTablet ? "Substituir as outras versões?" : "Substituir a versão para celular?"}>
          <p>{comTablet ? "Uma das outras versões já tem outra imagem. Elas vão ser trocadas pela imagem de computador (as outras continuam na biblioteca)." : "A versão para celular já tem outra imagem. Ela vai ser trocada pela imagem de computador (a outra continua na biblioteca)."}</p>
          <div className={estilos.botoes}>
            <Botao
              type="button"
              variante="secundario"
              onClick={() => {
                setConfirmarCopia(false);
                copiarRef.current?.focus();
              }}
            >
              Manter a imagem atual
            </Botao>
            <Botao ref={confirmarRef} type="button" onClick={copiar}>
              Substituir
            </Botao>
          </div>
        </CaixaDoPainel>
      )}
      <p className="somente-leitor" aria-live="polite">{anuncio}</p>
    </div>
  );
}

// Texto alternativo com contador; o alt da imagem escolhida entra como
// sugestão quando o campo ainda está vazio (ou com o alt da anterior).
function CampoDoAlt({ id, valor, aoMudar, erro, obrigatorio }: { id: string; valor: string; aoMudar: (valor: string) => void; erro?: string; obrigatorio: boolean }) {
  return (
    <div className={estilos.grupo}>
      <label htmlFor={id} className={estilos.rotulo}>
        Texto alternativo {obrigatorio && <span aria-hidden="true">*</span>}
      </label>
      <p id={`${id}-ajuda`} className={estilos.ajuda}>Descreve a imagem para quem não pode vê-la. Num banner com link, é também o nome do link.</p>
      <input
        id={id}
        name="alt"
        type="text"
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        maxLength={LIMITE_DO_ALT_DA_HOME}
        autoComplete="off"
        aria-required={obrigatorio || undefined}
        aria-invalid={erro ? true : undefined}
        aria-describedby={[`${id}-ajuda`, `${id}-contador`, erro ? `${id}-erro` : ""].filter(Boolean).join(" ")}
        className={`${estilos.entrada} ${erro ? estilos.entradaComErro : ""}`}
      />
      <p id={`${id}-contador`} className={estilos.contador}>
        {valor.length} de {LIMITE_DO_ALT_DA_HOME} caracteres
      </p>
      {erro && <p id={`${id}-erro`} className={estilos.erro}>{erro}</p>}
    </div>
  );
}


// Tamanho de referência de cada prévia (largura x altura da tela) e a
// moldura que a mostra em escala, com o mesmo componente do site.
const TELAS_DA_PREVIA: Record<FormatoDaPrevia, { largura: number; altura: number; rotulo: string }> = {
  computador: { largura: 1280, altura: 720, rotulo: "Computador" },
  tablet: { largura: 768, altura: 1024, rotulo: "Tablet" },
  celular: { largura: 390, altura: 844, rotulo: "Celular" },
};

function MolduraDaPrevia({ formato, slide }: { formato: FormatoDaPrevia; slide: SlideDoBanner }) {
  const tela = TELAS_DA_PREVIA[formato];
  const moldura = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0);
  useEffect(() => {
    const elemento = moldura.current;
    if (!elemento) return;
    const medir = () => setEscala(elemento.clientWidth / tela.largura);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [tela.largura]);
  return (
    <figure className={estilos.previaDoBanner}>
      <div ref={moldura} className={estilos.telaDaPrevia} style={{ aspectRatio: `${tela.largura} / ${tela.altura}` } as CSSProperties} aria-hidden="true" inert>
        <div className={estilos.escalaDaPrevia} style={{ width: tela.largura, height: tela.altura, transform: `scale(${escala})` }}>
          <ConteudoDoSlide slide={slide} formato={formato} />
        </div>
      </div>
      <figcaption className={estilos.legendaDaVersao}>{tela.rotulo}</figcaption>
    </figure>
  );
}

// Campo de texto com contador (30/10/2026): rótulo, campo, contador e depois
// a ajuda curta; o erro fica junto do campo, com role="alert".
function CampoDeTexto({
  id,
  rotulo,
  nome,
  valor,
  aoMudar,
  aoSair,
  limite,
  erro,
  ajuda,
  exemplo,
  multilinha,
}: {
  id: string;
  rotulo: string;
  nome: string;
  valor: string;
  aoMudar: (valor: string) => void;
  aoSair?: () => void;
  limite: number;
  erro?: string;
  ajuda?: string;
  exemplo?: string;
  multilinha?: boolean;
}) {
  const descricao = [`${id}-contador`, ajuda ? `${id}-ajuda` : "", erro ? `${id}-erro` : ""].filter(Boolean).join(" ");
  const comum = {
    id,
    name: nome,
    value: valor,
    maxLength: limite,
    placeholder: exemplo,
    autoComplete: "off",
    onBlur: aoSair,
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": descricao,
    className: `${estilos.entrada} ${erro ? estilos.entradaComErro : ""}`,
  } as const;
  return (
    <div className={estilos.grupo}>
      <label htmlFor={id} className={estilos.rotulo}>{rotulo}</label>
      {multilinha ? <textarea {...comum} rows={3} onChange={(evento) => aoMudar(evento.target.value)} /> : <input {...comum} type="text" onChange={(evento) => aoMudar(evento.target.value)} />}
      <p id={`${id}-contador`} className={estilos.contador}>{valor.length} de {limite} caracteres</p>
      {ajuda && <p id={`${id}-ajuda`} className={estilos.ajuda}>{ajuda}</p>}
      {erro && <p id={`${id}-erro`} role="alert" className={estilos.erro}>{erro}</p>}
    </div>
  );
}

function GrupoDeOpcoes<T extends string>({ id, legenda, ajuda, nome, opcoes, rotulos, valor, aoMudar, erro }: { id: string; legenda: string; ajuda?: string; nome: string; opcoes: readonly T[]; rotulos: Record<T, string>; valor: T; aoMudar: (valor: T) => void; erro?: string }) {
  return (
    <fieldset className={estilos.grupoSemMoldura} aria-describedby={[ajuda ? `${id}-ajuda` : "", erro ? `${id}-erro` : ""].filter(Boolean).join(" ") || undefined}>
      <legend className={estilos.rotulo}>{legenda}</legend>
      {ajuda && <p id={`${id}-ajuda`} className={estilos.ajuda}>{ajuda}</p>}
      <div className={estilos.opcoesDoFoco}>
        {opcoes.map((opcao) => (
          <label key={opcao} className={estilos.opcao}>
            <input type="radio" name={nome} value={opcao} checked={valor === opcao} onChange={() => aoMudar(opcao)} />
            {rotulos[opcao]}
          </label>
        ))}
      </div>
      {erro && <p id={`${id}-erro`} className={estilos.erro}>{erro}</p>}
    </fieldset>
  );
}

// Palavra acima disto no título do banner: aviso de que ele será reduzido.
const LIMITE_DA_PALAVRA_DO_TITULO = 18;

type TipoDoLink = "nenhum" | "secao" | "pagina" | "externo";
const ROTULOS_DOS_TIPOS_DE_LINK: Record<TipoDoLink, string> = { nenhum: "Sem link", secao: "Seção da home", pagina: "Página do site", externo: "Link externo" };
const OUTRO_CAMINHO = "outro";

function tipoDoLink(href: string): TipoDoLink {
  if (!href) return "nenhum";
  if (href.startsWith("#") || href.startsWith("/#")) return "secao";
  if (href.startsWith("https://")) return "externo";
  return "pagina";
}

// Link do banner com tipo (30/10/2026): seção da home (âncoras de
// src/lib/site/ancoras.ts), página do site (lista das páginas conhecidas ou
// "Outro caminho") ou link externo (https://). O formulário envia um só
// campo, "href". Validação ao sair do campo e ao salvar, pela mesma função
// do servidor (validarLinkDoBanner); trocar o tipo limpa o valor e o erro;
// endereço do próprio site vira o caminho interno, com aviso.
function CampoDoLink({
  id,
  valor,
  aoMudar,
  erro,
  aoErro,
  artigosAtivo,
}: {
  id: string;
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
  aoErro: (mensagem: string | undefined) => void;
  artigosAtivo: boolean;
}) {
  const [tipo, setTipo] = useState<TipoDoLink>(() => tipoDoLink(valor));
  const [outro, setOutro] = useState(() => tipoDoLink(valor) === "pagina" && !PAGINAS_DO_SITE.some((pagina) => pagina.href === valor));
  const [aviso, setAviso] = useState<string | null>(null);

  function trocarTipo(novo: TipoDoLink) {
    setTipo(novo);
    setOutro(false);
    setAviso(null);
    aoErro(undefined);
    // O valor do tipo anterior não fica guardado.
    aoMudar(novo === "secao" ? `#${ANCORAS_DA_HOME[ANCORAS_DA_HOME.length - 1].id}` : "");
  }

  function mudar(novo: string) {
    setAviso(null);
    aoErro(undefined);
    aoMudar(novo);
  }

  // Ao sair do campo: confere e, se for o endereço do próprio site, converte.
  function conferir() {
    if (!valor.trim()) return;
    const lido = validarLinkDoBanner(valor);
    if (!lido.ok) return aoErro(lido.mensagem);
    if (lido.convertido) {
      setTipo("pagina");
      setOutro(!PAGINAS_DO_SITE.some((pagina) => pagina.href === lido.href));
      aoMudar(lido.href);
      setAviso(`Este é um endereço do próprio site: ficou o caminho interno ${lido.href}.`);
    }
  }

  const descricao = [`${id}-ajuda`, erro ? `${id}-erro` : "", aviso ? `${id}-aviso` : ""].filter(Boolean).join(" ");
  const ajudas: Record<TipoDoLink, string> = {
    nenhum: "O banner não é link.",
    secao: "O banner leva a uma seção desta página: a tela rola até ela.",
    pagina: "Uma página deste site, aberta na mesma aba.",
    externo: "Um endereço completo começando com https://, aberto em nova aba.",
  };
  const valorDaLista = outro ? OUTRO_CAMINHO : PAGINAS_DO_SITE.some((pagina) => pagina.href === valor) ? valor : "";
  return (
    <div className={estilos.grupo}>
      <input type="hidden" name="href" value={valor} />
      <label htmlFor={`${id}-tipo`} className={estilos.rotulo}>Link de destino</label>
      <select id={`${id}-tipo`} value={tipo} onChange={(evento) => trocarTipo(evento.target.value as TipoDoLink)} className={estilos.entrada} aria-describedby={`${id}-ajuda`}>
        {(Object.keys(ROTULOS_DOS_TIPOS_DE_LINK) as TipoDoLink[]).map((opcao) => (
          <option key={opcao} value={opcao}>
            {ROTULOS_DOS_TIPOS_DE_LINK[opcao]}
          </option>
        ))}
      </select>
      <p id={`${id}-ajuda`} className={estilos.ajuda}>{ajudas[tipo]}</p>
      {tipo === "secao" && (
        <>
          <label htmlFor={id} className={estilos.rotulo}>Seção da home</label>
          <select id={id} value={valor.replace(/^\//, "")} onChange={(evento) => mudar(evento.target.value)} className={`${estilos.entrada} ${erro ? estilos.entradaComErro : ""}`} aria-invalid={erro ? true : undefined} aria-describedby={descricao}>
            {ANCORAS_DA_HOME.map((ancora) => (
              <option key={ancora.id} value={`#${ancora.id}`}>
                {ancora.nome}
              </option>
            ))}
          </select>
        </>
      )}
      {tipo === "pagina" && (
        <>
          <label htmlFor={`${id}-pagina`} className={estilos.rotulo}>Página</label>
          <select
            id={`${id}-pagina`}
            value={valorDaLista}
            onChange={(evento) => {
              const escolhida = evento.target.value;
              setOutro(escolhida === OUTRO_CAMINHO);
              mudar(escolhida === OUTRO_CAMINHO ? "" : escolhida);
            }}
            className={`${estilos.entrada} ${erro && !outro ? estilos.entradaComErro : ""}`}
            aria-invalid={erro && !outro ? true : undefined}
            aria-describedby={descricao}
          >
            <option value="">Escolha a página</option>
            {PAGINAS_DO_SITE.map((pagina) => {
              const desativada = pagina.href === "/artigos" && !artigosAtivo;
              return (
                <option key={pagina.href} value={pagina.href} disabled={desativada}>
                  {pagina.nome}
                  {desativada ? " (desativado nas configurações)" : ""}
                </option>
              );
            })}
            <option value={OUTRO_CAMINHO}>Outro caminho</option>
          </select>
          {outro && (
            <>
              <label htmlFor={id} className={estilos.rotulo}>Caminho da página</label>
              <input id={id} type="text" inputMode="url" value={valor} onChange={(evento) => mudar(evento.target.value)} onBlur={conferir} placeholder="Ex.: /blog/nome-do-post" maxLength={LIMITE_DO_LINK} autoComplete="off" spellCheck={false} aria-invalid={erro ? true : undefined} aria-describedby={descricao} className={`${estilos.entrada} ${erro ? estilos.entradaComErro : ""}`} />
            </>
          )}
        </>
      )}
      {tipo === "externo" && (
        <>
          <label htmlFor={id} className={estilos.rotulo}>Endereço do link externo</label>
          <input id={id} type="text" inputMode="url" value={valor} onChange={(evento) => mudar(evento.target.value)} onBlur={conferir} placeholder="Ex.: https://www.exemplo.org" maxLength={LIMITE_DO_LINK} autoComplete="off" spellCheck={false} aria-invalid={erro ? true : undefined} aria-describedby={descricao} className={`${estilos.entrada} ${erro ? estilos.entradaComErro : ""}`} />
        </>
      )}
      {aviso && <p id={`${id}-aviso`} className={estilos.ajuda} role="status">{aviso}</p>}
      {erro && <p id={`${id}-erro`} role="alert" className={estilos.erro}>{erro}</p>}
    </div>
  );
}

function FormularioDoBanner({ banner, total, artigosAtivo, aoTerminar, aoCancelar }: { banner: BannerNaTela | null; total: number; artigosAtivo: boolean; aoTerminar: (mensagem: string) => void; aoCancelar: () => void }) {
  const id = useId();
  const [resposta, salvar, salvando] = useActionState(salvarBannerDaHome, null);
  const [chave] = useState(() => banner?.chave ?? novaChave());
  const [alt, setAlt] = useState(banner?.alt ?? "");
  // Controlados: um erro na resposta não apaga o que foi digitado.
  const [href, setHref] = useState(banner?.href ?? "");
  const [ativo, setAtivo] = useState(banner ? banner.ativo : true);
  const [pontoDeFoco, setPontoDeFoco] = useState<PontoDeFoco>(banner?.pontoDeFoco ?? "centro");
  const [titulo, setTitulo] = useState(banner?.titulo ?? "");
  const [trechoEmDestaque, setTrechoEmDestaque] = useState(banner?.trechoEmDestaque ?? "");
  const [subtitulo, setSubtitulo] = useState(banner?.subtitulo ?? "");
  const [textoDoBotao, setTextoDoBotao] = useState(banner?.textoDoBotao ?? "");
  const [posicaoDoTexto, setPosicaoDoTexto] = useState<PosicaoDoTexto>(banner?.posicaoDoTexto ?? "esquerda");
  const [imagens, setImagens] = useState<EstadoDasVersoes>({
    computador: banner?.midiaId ? { id: banner.midiaId, imagem: banner.imagem } : null,
    tablet: banner?.midiaTabletId ? { id: banner.midiaTabletId, imagem: banner.imagemTablet } : null,
    celular: banner?.midiaMobileId ? { id: banner.midiaMobileId, imagem: banner.imagemCelular } : null,
  });
  const [inicial] = useState(imagens);
  const ultimoAltSugerido = useRef(banner?.imagem?.alt ?? "");
  // Posição: o banner novo entra no fim.
  const maximo = banner ? total : total + 1;
  const [posicao, setPosicao] = useState(banner?.ordem ?? maximo);
  const resumoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resposta?.ok) aoTerminar(resposta.mensagem);
    else if (resposta) resumoRef.current?.focus();
  }, [resposta, aoTerminar]);

  function aoMudarImagem(versao: Versao, escolha: EscolhaDeImagem) {
    setImagens((atual) => ({ ...atual, [versao]: escolha }));
    if (versao !== "computador") return;
    const sugerido = escolha?.imagem?.alt ?? "";
    if (sugerido && (!alt || alt === ultimoAltSugerido.current)) setAlt(sugerido);
    ultimoAltSugerido.current = sugerido;
  }

  // Erros à vista (30/10/2026): os da resposta do servidor e os da
  // conferência no navegador; cada um some quando o campo dele muda.
  const [erros, setErros] = useState<Partial<Record<CampoDoBanner, string>>>({});
  const [respostaVista, setRespostaVista] = useState(resposta);
  if (resposta !== respostaVista) {
    setRespostaVista(resposta);
    setErros(resposta?.ok === false ? resposta.erros ?? {} : {});
  }
  const definirErro = (campo: CampoDoBanner, mensagem: string | undefined) => setErros((atual) => ({ ...atual, [campo]: mensagem }));
  const ao = (campo: CampoDoBanner, mudar: (valor: string) => void) => (valor: string) => {
    mudar(valor);
    if (erros[campo]) definirErro(campo, undefined);
  };
  function conferirTextoDoBotao() {
    if (textoDoBotaoPareceEndereco(textoDoBotao)) definirErro("textoDoBotao", MENSAGEM_TEXTO_DO_BOTAO_COM_ENDERECO);
  }
  // Ao salvar, a mesma conferência do servidor, antes de enviar.
  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    const novos: Partial<Record<CampoDoBanner, string>> = {};
    const link = validarLinkDoBanner(href);
    if (!link.ok) novos.href = link.mensagem;
    if (textoDoBotaoPareceEndereco(textoDoBotao)) novos.textoDoBotao = MENSAGEM_TEXTO_DO_BOTAO_COM_ENDERECO;
    if (Object.keys(novos).length > 0) {
      evento.preventDefault();
      setErros((atual) => ({ ...atual, ...novos }));
    } else if (link.ok && link.href !== href) setHref(link.href);
  }
  const limitar = (valor: number) => Math.min(Math.max(valor, 1), maximo);
  const temImagem = Boolean(imagens.computador);
  const slideDaPrevia: SlideDoBanner = {
    imagem: "",
    midia: imagens.computador?.imagem ? { ...imagens.computador.imagem, alt, tablet: imagens.tablet?.imagem ?? null, celular: imagens.celular?.imagem ?? null } : undefined,
    alt,
    href: "",
    rotulo: "",
    pontoDeFoco,
    texto: temTextoNoBanner({ titulo, subtitulo, textoDoBotao }) ? { titulo: titulo.trim(), trechoEmDestaque: trechoEmDestaque.trim(), subtitulo: subtitulo.trim(), textoDoBotao: textoDoBotao.trim(), posicao: posicaoDoTexto } : null,
  };

  return (
    <form action={salvar} onSubmit={aoEnviar} className={estilos.formulario}>
      <input type="hidden" name="chave" value={chave} />
      {resposta?.ok === false && (Object.keys(resposta.erros ?? {}).length === 0 || Object.values(erros).some(Boolean)) && (
        <Mensagem tipo="erro" ref={resumoRef}>
          {resposta.mensagem}
        </Mensagem>
      )}

      <section className={estilos.caixaDoModal} aria-labelledby={`${id}-imagens`}>
        <h3 id={`${id}-imagens`} className={estilos.tituloDaCaixa}>Imagens</h3>
        <CaixaDoPainel tipo="informacao">{AVISO_IMAGEM_SEM_TEXTO}</CaixaDoPainel>
        <VersoesDaImagem
          idDoDono={chave}
          campos={{ computador: "banner", tablet: "bannerTablet", celular: "bannerCelular" }}
          proporcoes={PROPORCOES_DO_BANNER}
          rotulo="banner"
          pontoDeFoco={pontoDeFoco}
          dica={DICA_DO_BANNER}
          avisarLarga
          inicial={inicial}
          erros={erros}
          aoMudar={aoMudarImagem}
        />
        <CampoDoAlt id={`${id}-alt`} valor={alt} aoMudar={ao("alt", setAlt)} erro={erros.alt} obrigatorio={temImagem} />
      </section>

      <section className={estilos.caixaDoModal} aria-labelledby={`${id}-texto`}>
        <h3 id={`${id}-texto`} className={estilos.tituloDaCaixa}>Texto</h3>
        <p className={estilos.ajuda}>Opcional. Sem título, subtítulo e botão, o banner mostra só a imagem, como antes.</p>
        <CampoDeTexto id={`${id}-titulo`} rotulo="Título" nome="titulo" valor={titulo} aoMudar={ao("titulo", setTitulo)} limite={LIMITE_DO_TITULO_DO_BANNER} erro={erros.titulo} />
        {titulo.split(/\s+/).some((palavra) => palavra.length > LIMITE_DA_PALAVRA_DO_TITULO) && <CaixaDoPainel tipo="atencao">Palavra muito longa: o título será reduzido para caber.</CaixaDoPainel>}
        <CampoDeTexto
          id={`${id}-destaque`}
          rotulo="Trecho em destaque"
          nome="trechoEmDestaque"
          valor={trechoEmDestaque}
          aoMudar={ao("trechoEmDestaque", setTrechoEmDestaque)}
          limite={LIMITE_DO_TITULO_DO_BANNER}
          erro={erros.trechoEmDestaque}
          ajuda="Uma parte do título, escrita exatamente igual, que aparece em negrito e na cor de destaque."
        />
        <CampoDeTexto id={`${id}-subtitulo`} rotulo="Subtítulo" nome="subtitulo" valor={subtitulo} aoMudar={ao("subtitulo", setSubtitulo)} limite={LIMITE_DO_SUBTITULO_DO_BANNER} erro={erros.subtitulo} multilinha />
      </section>

      <section className={estilos.caixaDoModal} aria-labelledby={`${id}-link`}>
        <h3 id={`${id}-link`} className={estilos.tituloDaCaixa}>Botão e link</h3>
        <CampoDeTexto
          id={`${id}-botao`}
          rotulo="Texto do botão"
          nome="textoDoBotao"
          valor={textoDoBotao}
          aoMudar={ao("textoDoBotao", setTextoDoBotao)}
          aoSair={conferirTextoDoBotao}
          exemplo="Ex.: Acesse nosso blog"
          limite={LIMITE_DO_TEXTO_DO_BOTAO}
          erro={erros.textoDoBotao}
          ajuda="Uma frase curta. Com texto, o botão leva ao link de destino abaixo (e o banner inteiro continua clicável); sem texto, o banner inteiro é o link."
        />
        <CampoDoLink id={`${id}-href`} valor={href} aoMudar={setHref} erro={erros.href} aoErro={(mensagem) => definirErro("href", mensagem)} artigosAtivo={artigosAtivo} />
        {!artigosAtivo && ehCaminhoDosArtigos(href.trim()) && (
          <CaixaDoPainel tipo="atencao">Os Artigos estão fora do site (em Configurações). Enquanto isso, este banner aparece sem link.</CaixaDoPainel>
        )}
      </section>

      <section className={estilos.caixaDoModal} aria-labelledby={`${id}-posicao-foco`}>
        <h3 id={`${id}-posicao-foco`} className={estilos.tituloDaCaixa}>Posição e foco</h3>
        <GrupoDeOpcoes id={`${id}-posicao-texto`} legenda="Posição do texto" nome="posicaoDoTexto" opcoes={POSICOES_DO_TEXTO} rotulos={ROTULOS_DAS_POSICOES_DO_TEXTO} valor={posicaoDoTexto} aoMudar={setPosicaoDoTexto} erro={erros.posicaoDoTexto} ajuda="A posição vale só no computador. No tablet e no celular, o texto fica sempre centralizado na parte de baixo do banner." />
        <GrupoDeOpcoes
          id={`${id}-foco`}
          legenda="Ponto de foco da imagem"
          ajuda="Escolha a parte da imagem que não pode ser cortada em telas mais estreitas ou mais altas."
          nome="pontoDeFoco"
          opcoes={PONTOS_DE_FOCO}
          rotulos={ROTULOS_DOS_PONTOS_DE_FOCO}
          valor={pontoDeFoco}
          aoMudar={setPontoDeFoco}
          erro={erros.pontoDeFoco}
        />
      </section>

      <section className={estilos.caixaDoModal} aria-labelledby={`${id}-previa`}>
        <h3 id={`${id}-previa`} className={estilos.tituloDaCaixa}>Prévia</h3>
        <p className={estilos.ajuda}>O banner como aparece no site, com o texto e o botão sobre a imagem de cada versão.</p>
        {slideDaPrevia.midia ? (
          <div className={estilos.previas}>
            {(["computador", "tablet", "celular"] as const).map((formato) => (
              <MolduraDaPrevia key={formato} formato={formato} slide={slideDaPrevia} />
            ))}
          </div>
        ) : (
          <p className={estilos.ajuda}>Envie a versão para computador para ver a prévia.</p>
        )}
      </section>

      <section className={estilos.caixaDoModal} aria-labelledby={`${id}-publicacao`}>
        <h3 id={`${id}-publicacao`} className={estilos.tituloDaCaixa}>Publicação</h3>
        <label className={estilos.opcao}>
          <input type="checkbox" name="ativo" value="sim" checked={ativo} onChange={(evento) => setAtivo(evento.target.checked)} />
          Ativo (aparece no carrossel da home)
        </label>

        <fieldset className={estilos.grupoSemMoldura} aria-describedby={erros.posicao ? `${id}-posicao-erro` : undefined}>
          <legend className={estilos.rotulo}>Posição no carrossel</legend>
          <div className={estilos.posicao}>
            <Botao type="button" variante="secundario" onClick={() => setPosicao(limitar(posicao - 1))} disabled={posicao <= 1} aria-label={`Subir uma posição (agora ${posicao} de ${maximo})`}>
              Subir
            </Botao>
            <label htmlFor={`${id}-posicao`} className="somente-leitor">Posição, de 1 a {maximo}</label>
            <input
              id={`${id}-posicao`}
              name="posicao"
              type="number"
              min={1}
              max={maximo}
              value={posicao}
              onChange={(evento) => setPosicao(limitar(Number(evento.target.value) || 1))}
              className={`${estilos.entrada} ${estilos.numero}`}
            />
            <Botao type="button" variante="secundario" onClick={() => setPosicao(limitar(posicao + 1))} disabled={posicao >= maximo} aria-label={`Descer uma posição (agora ${posicao} de ${maximo})`}>
              Descer
            </Botao>
            <span className={estilos.ajuda} aria-live="polite">
              {nomeDoBanner(posicao)} de {maximo}
            </span>
          </div>
          {erros.posicao && <p id={`${id}-posicao-erro`} className={estilos.erro}>{erros.posicao}</p>}
        </fieldset>
      </section>

      <div className={estilos.botoes}>
        <Botao type="button" variante="secundario" onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </Botao>
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </Botao>
      </div>
    </form>
  );
}

function FormularioDoEspaco({ espaco, aoTerminar, aoCancelar }: { espaco: EspacoNaTela; aoTerminar: (mensagem: string) => void; aoCancelar: () => void }) {
  const id = useId();
  const [resposta, salvar, salvando] = useActionState(salvarImagemDaSecao, null);
  const [alt, setAlt] = useState(espaco.alt);
  const [temImagem, setTemImagem] = useState(Boolean(espaco.midiaId));
  const ultimoAltSugerido = useRef(espaco.imagem?.alt ?? "");
  const resumoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resposta?.ok) aoTerminar(resposta.mensagem);
    else if (resposta) resumoRef.current?.focus();
  }, [resposta, aoTerminar]);

  function aoMudarImagem(versao: Versao, escolha: EscolhaDeImagem) {
    if (versao !== "computador") return;
    setTemImagem(escolha !== null);
    const sugerido = escolha?.imagem?.alt ?? "";
    if (sugerido && (!alt || alt === ultimoAltSugerido.current)) setAlt(sugerido);
    ultimoAltSugerido.current = sugerido;
  }

  const erros = resposta?.ok === false ? resposta.erros ?? {} : {};
  return (
    <form action={salvar} className={estilos.formulario}>
      <input type="hidden" name="identificador" value={espaco.identificador} />
      {resposta?.ok === false && (
        <Mensagem tipo="erro" ref={resumoRef}>
          {resposta.mensagem}
        </Mensagem>
      )}
      <p className={estilos.ajuda}>Sem imagem, a home mostra o espaço de imagem padrão nesta seção.</p>
      <VersoesDaImagem
        idDoDono={espaco.identificador}
        campos={{ computador: "secao", celular: "secaoCelular" }}
        proporcoes={espaco.proporcoes}
        rotulo={espaco.nome}
        inicial={{
          computador: espaco.midiaId ? { id: espaco.midiaId, imagem: espaco.imagem } : null,
          celular: espaco.midiaMobileId ? { id: espaco.midiaMobileId, imagem: espaco.imagemCelular } : null,
        }}
        erros={erros}
        aoMudar={aoMudarImagem}
      />
      <CampoDoAlt id={`${id}-alt`} valor={alt} aoMudar={setAlt} erro={erros.alt} obrigatorio={temImagem} />
      <div className={estilos.botoes}>
        <Botao type="button" variante="secundario" onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </Botao>
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </Botao>
      </div>
    </form>
  );
}

function ConfirmarExclusao({ banner, aoTerminar, aoCancelar }: { banner: BannerNaTela; aoTerminar: (mensagem: string) => void; aoCancelar: () => void }) {
  const [resposta, excluir, excluindo] = useActionState<RespostaDaHome, FormData>(excluirBannerDaHome, null);
  useEffect(() => {
    if (resposta?.ok) aoTerminar(resposta.mensagem);
  }, [resposta, aoTerminar]);
  return (
    <form action={excluir} className={estilos.formulario}>
      <input type="hidden" name="chave" value={banner.chave} />
      <p className="tipo-texto">
        O {banner.nome.toLowerCase()} sai do carrossel da home. A imagem continua na biblioteca de mídia. Esta ação não pode ser desfeita.
      </p>
      {resposta?.ok === false && <Mensagem tipo="erro">{resposta.mensagem}</Mensagem>}
      <div className={estilos.botoes}>
        <Botao type="button" variante="secundario" onClick={aoCancelar} disabled={excluindo}>
          Cancelar
        </Botao>
        <Botao type="submit" disabled={excluindo}>
          {excluindo ? "Excluindo..." : `Excluir o ${banner.nome.toLowerCase()}`}
        </Botao>
      </div>
    </form>
  );
}

// Tela /admin/home (29/10/2026): banners do carrossel e imagens fixas das
// sections em cartões; "Editar" abre o Modal com o envio de imagem do item.
export function HomeAdminClient({
  banners,
  espacos,
  artigosAtivo = true,
  video = null,
  capaDoVideo = null,
}: {
  banners: BannerNaTela[];
  espacos: EspacoNaTela[];
  artigosAtivo?: boolean;
  video?: VideoQuemSomos | null;
  capaDoVideo?: ImagemNaTela | null;
}) {
  const [janela, setJanela] = useState<Janela>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const fechar = useCallback(() => setJanela(null), []);
  const concluir = useCallback((mensagem: string) => {
    setJanela(null);
    setAviso(mensagem);
  }, []);
  const abrir = (nova: Janela) => {
    setAviso(null);
    setJanela(nova);
  };
  const noLimite = banners.length >= LIMITE_DE_BANNERS;
  const algumAtivo = banners.some((banner) => banner.ativo && banner.imagem);

  return (
    <div className={estilos.pagina}>
      <CabecalhoDoPainel
        trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Home" }]}
        titulo="Home"
        descricao="Imagens da página inicial do site: os banners do carrossel e as imagens fixas das seções."
        acao={
          <Botao onClick={() => abrir({ tipo: "banner", banner: null })} disabled={noLimite}>
            Adicionar banner
          </Botao>
        }
      />

      <div aria-live="polite">{aviso && <Mensagem tipo="sucesso">{aviso}</Mensagem>}</div>

      <section className={estilos.secao} aria-labelledby="titulo-banners">
        <h2 id="titulo-banners" className="tipo-texto-lg">Banners do carrossel</h2>
        <div className={estilos.caixa}>
          <p className={estilos.ajuda}>
            {algumAtivo
              ? `Só os banners ativos e com imagem aparecem na home, nesta ordem. Até ${LIMITE_DE_BANNERS} banners.`
              : `Nenhum banner ativo com imagem: a home mostra o carrossel padrão (3 imagens provisórias). Até ${LIMITE_DE_BANNERS} banners.`}
          </p>
        </div>
        {banners.length === 0 ? (
          <div className={estilos.vazio}>
            <p className="tipo-texto">Nenhum banner cadastrado ainda.</p>
            <Botao variante="secundario" onClick={() => abrir({ tipo: "banner", banner: null })}>
              Adicionar o primeiro banner
            </Botao>
          </div>
        ) : (
          <ul role="list" className={estilos.grade}>
            {banners.map((banner) => (
              <li key={banner.chave} className={estilos.cartao}>
                <Miniaturas
                  proporcoes={PROPORCOES_DO_BANNER}
                  midiaId={banner.midiaId}
                  imagem={banner.imagem}
                  midiaMobileId={banner.midiaMobileId}
                  imagemCelular={banner.imagemCelular}
                  tablet={{ midiaTabletId: banner.midiaTabletId, imagem: banner.imagemTablet }}
                  vazio="Sem imagem"
                />
                <div className={estilos.texto}>
                  <h3 className={estilos.nome}>{banner.nome}</h3>
                  <p className={estilos.etiquetas}>
                    <span className={estilos.etiqueta}>{banner.chave}</span>
                    <span className={`${estilos.etiqueta} ${banner.ativo ? estilos.ativo : ""}`}>{banner.ativo ? "Ativo" : "Inativo"}</span>
                    {banner.midiaId && !banner.midiaTabletId && <span className={estilos.etiqueta}>Sem versão tablet</span>}
                    {banner.midiaId && !banner.midiaMobileId && <span className={estilos.etiqueta}>Sem versão celular</span>}
                    {temTextoNoBanner(banner) && <span className={estilos.etiqueta}>Com texto</span>}
                    {banner.href && !artigosAtivo && ehCaminhoDosArtigos(banner.href) && <span className={estilos.etiqueta}>Sem link: Artigos fora do site</span>}
                  </p>
                  <p className={estilos.detalhe}>
                    {banner.href ? `Link: ${banner.href}${linkEhExterno(banner.href) ? " (abre em nova aba)" : ""}` : "Sem link"}
                  </p>
                </div>
                <div className={estilos.acoes}>
                  <Botao variante="secundario" onClick={() => abrir({ tipo: "banner", banner })} aria-label={`Editar o ${banner.nome.toLowerCase()}`}>
                    Editar
                  </Botao>
                  <Botao variante="secundario" onClick={() => abrir({ tipo: "excluir", banner })} aria-label={`Excluir o ${banner.nome.toLowerCase()}`}>
                    Excluir
                  </Botao>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-espacos">
        <h2 id="titulo-espacos" className="tipo-texto-lg">Imagens das seções</h2>
        <ul role="list" className={estilos.grade}>
          {espacos.map((espaco) => (
            <li key={espaco.identificador} className={estilos.cartao}>
              <Miniaturas proporcoes={espaco.proporcoes} midiaId={espaco.midiaId} imagem={espaco.imagem} midiaMobileId={espaco.midiaMobileId} imagemCelular={espaco.imagemCelular} vazio="Padrão do site" />
              <div className={estilos.texto}>
                <h3 className={estilos.nome}>{espaco.nome}</h3>
                <p className={estilos.etiquetas}>
                  <span className={estilos.etiqueta}>{espaco.identificador}</span>
                  {espaco.midiaId && !espaco.midiaMobileId && <span className={estilos.etiqueta}>Sem versão celular</span>}
                </p>
                <p className={estilos.detalhe}>Onde aparece: {espaco.onde}.</p>
              </div>
              <div className={estilos.acoes}>
                <Botao variante="secundario" onClick={() => abrir({ tipo: "espaco", espaco })} aria-label={`Editar a imagem de ${espaco.nome}`}>
                  Editar
                </Botao>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <VideoQuemSomosAdmin video={video} capa={capaDoVideo} aoTerminar={concluir} />

      <Modal aberto={janela?.tipo === "banner"} aoFechar={fechar} titulo={janela?.tipo === "banner" ? (janela.banner ? `Editar o ${janela.banner.nome.toLowerCase()}` : "Adicionar banner") : "Banner"} largura="larga">
        {janela?.tipo === "banner" && <FormularioDoBanner banner={janela.banner} total={banners.length} artigosAtivo={artigosAtivo} aoTerminar={concluir} aoCancelar={fechar} />}
      </Modal>
      <Modal aberto={janela?.tipo === "espaco"} aoFechar={fechar} titulo={janela?.tipo === "espaco" ? `Imagem de "${janela.espaco.nome}"` : "Imagem da seção"} largura="larga">
        {janela?.tipo === "espaco" && <FormularioDoEspaco espaco={janela.espaco} aoTerminar={concluir} aoCancelar={fechar} />}
      </Modal>
      <Modal aberto={janela?.tipo === "excluir"} aoFechar={fechar} titulo={janela?.tipo === "excluir" ? `Excluir o ${janela.banner.nome.toLowerCase()}` : "Excluir banner"}>
        {janela?.tipo === "excluir" && <ConfirmarExclusao banner={janela.banner} aoTerminar={concluir} aoCancelar={fechar} />}
      </Modal>
    </div>
  );
}
