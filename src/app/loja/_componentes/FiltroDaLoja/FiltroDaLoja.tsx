"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode, useEffect, useId, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Botao } from "@/components/Botao/Botao";
import { IconeFechar, IconeFiltro, IconeSeta } from "@/components/Icones/Icones";
import { useAvisarMenuDaLoja } from "../MenuDaLoja/MenuDaLoja";
import {
  DISPONIBILIDADES,
  LIMITE_DA_BUSCA,
  ORDENS,
  PARAMETROS,
  TIPOS,
  contarOpcoes,
  enderecoDaLoja,
  erroDaFaixaDePreco,
  filtrosAtivos,
  lerPrecoDoFiltro,
  precoParaCampoDoFiltro,
  semFiltros,
  type FiltrosDaLoja,
  type ItemDoFiltro,
  type OpcoesDaLoja,
  type OrdemDaLoja,
} from "@/lib/filtrosDaLoja";
import { EtiquetasDosFiltros } from "../EtiquetasDosFiltros/EtiquetasDosFiltros";
import { FaixaDePreco, erroDosCamposDePreco } from "../FaixaDePreco/FaixaDePreco";
import { GrupoDoFiltro } from "../GrupoDoFiltro/GrupoDoFiltro";
import { OpcaoDoFiltro } from "../OpcaoDoFiltro/OpcaoDoFiltro";
import estilos from "./FiltroDaLoja.module.css";

// O que a pessoa está mexendo, antes de ir para a URL: os preços como texto.
type Rascunho = Omit<FiltrosDaLoja, "precoMinimo" | "precoMaximo"> & { precoMinimo: string; precoMaximo: string };

const paraRascunho = (filtros: FiltrosDaLoja): Rascunho => ({
  ...filtros,
  precoMinimo: precoParaCampoDoFiltro(filtros.precoMinimo),
  precoMaximo: precoParaCampoDoFiltro(filtros.precoMaximo),
});

const paraFiltros = (rascunho: Rascunho): FiltrosDaLoja => ({
  ...rascunho,
  busca: rascunho.busca.replace(/\s+/g, " ").trim().slice(0, LIMITE_DA_BUSCA),
  precoMinimo: lerPrecoDoFiltro(rascunho.precoMinimo),
  precoMaximo: lerPrecoDoFiltro(rascunho.precoMaximo),
});

// Até 1023px (celular e tablet em pé) o filtro vira painel, aberto pelo botão flutuante.
const MIDIA_DO_PAINEL = "(max-width: 1023px)";
function useModoPainel(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const midia = window.matchMedia(MIDIA_DO_PAINEL);
      midia.addEventListener("change", avisar);
      return () => midia.removeEventListener("change", avisar);
    },
    () => window.matchMedia(MIDIA_DO_PAINEL).matches,
    () => false,
  );
}

// false no servidor e na hidratação; true depois (controles que só funcionam
// com JavaScript). Os hooks precisam do prefixo "use" (regra do React).
const semAssinatura = () => () => {};
const useMontado = () => useSyncExternalStore(semAssinatura, () => true, () => false);

// Campos de texto e preço vão para a URL depois de uma pausa na digitação.
const ATRASO_DA_DIGITACAO_MS = 400;
const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Grupo = "busca" | "categoria" | "tipo" | "disponibilidade" | "preco" | "ofertas";
const TITULOS: Record<Grupo, string> = { busca: "Busca", categoria: "Categoria", tipo: "Tipo", disponibilidade: "Disponibilidade", preco: "Preço", ofertas: "Ofertas" };

// Marca ou desmarca um valor mantendo a ordem das opções.
function alternarValor<T extends string>(lista: T[], valor: T, marcar: boolean, ordem: readonly T[]): T[] {
  const nova = new Set(lista);
  if (marcar) nova.add(valor);
  else nova.delete(valor);
  return ordem.filter((item) => nova.has(item));
}

// Filtro da loja (29/10/2026). É um formulário GET que funciona sem
// JavaScript. Com JavaScript: a partir de 1024px, barra fixa à esquerda que
// aplica na hora (texto e preço com 400ms de pausa), sem recarregar a página;
// até 1023px, painel (diálogo) aberto pelo botão flutuante, que só aplica com
// "Filtrar". As contagens vêm das mesmas funções puras do servidor, sobre o
// rascunho, para ficarem certas enquanto a pessoa mexe no painel.
export function FiltroDaLoja({
  itens,
  opcoes,
  filtros,
  total,
  children,
}: {
  itens: ItemDoFiltro[];
  opcoes: OpcoesDaLoja;
  // Filtros aplicados, lidos da URL pelo servidor.
  filtros: FiltrosDaLoja;
  total: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const modoPainel = useModoPainel();
  const montado = useMontado();
  const id = useId();
  const idFormulario = `${id}-filtros`;
  const idTitulo = `${id}-titulo`;
  const idBusca = `${id}-busca`;
  const idOrdem = `${id}-ordem`;

  const painelRef = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const buscaRef = useRef<HTMLInputElement>(null);
  const contagemRef = useRef<HTMLParagraphElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  const urlAplicada = enderecoDaLoja(filtros);
  const [rascunho, setRascunho] = useState(() => paraRascunho(filtros));
  const [painelAberto, setPainelAberto] = useState(false);
  const avisarMenu = useAvisarMenuDaLoja();
  // Grupos que a pessoa abriu ou fechou; os outros seguem o padrão do modo.
  const [alternados, setAlternados] = useState<Partial<Record<Grupo, boolean>>>({});

  // A URL mudou por fora (voltar do navegador, etiqueta, link): o rascunho
  // passa a ser o que está aplicado. Respostas das próprias mudanças (as
  // últimas enviadas) não mexem no rascunho, para não apagar a digitação.
  const [urlVista, setUrlVista] = useState(urlAplicada);
  const [enviadas, setEnviadas] = useState<string[]>([urlAplicada]);
  if (urlVista !== urlAplicada) {
    setUrlVista(urlAplicada);
    if (!enviadas.includes(urlAplicada)) {
      setEnviadas([urlAplicada]);
      setRascunho(paraRascunho(filtros));
    }
  }

  // Ao trocar de modo (girar o tablet, redimensionar), os grupos voltam ao
  // padrão e um painel aberto fecha sem aplicar.
  const [modoVisto, setModoVisto] = useState(modoPainel);
  if (modoVisto !== modoPainel) {
    setModoVisto(modoPainel);
    setAlternados({});
    if (!modoPainel && painelAberto) {
      setPainelAberto(false);
      setRascunho(paraRascunho(filtros));
    }
  }

  const grupos: Grupo[] = ["busca", ...(opcoes.categorias.length ? (["categoria"] as const) : []), "tipo", "disponibilidade", ...(opcoes.faixaDePreco ? (["preco"] as const) : []), "ofertas"];
  // Na barra, todos abertos; no painel, só os dois primeiros.
  const estaAberto = (grupo: Grupo) => alternados[grupo] ?? (!modoPainel || grupos.indexOf(grupo) < 2);

  const filtrosDoRascunho = paraFiltros(rascunho);
  const contagens = contarOpcoes(itens, filtrosDoRascunho, opcoes);
  const erroDaFaixa = erroDaFaixaDePreco(filtrosDoRascunho);
  const ativos = filtrosAtivos(filtros, opcoes);

  function navegar(endereco: string) {
    clearTimeout(temporizador.current);
    setEnviadas((lista) => [...lista.slice(-9), endereco]);
    iniciarTransicao(() => router.replace(endereco, { scroll: false }));
  }

  // Na barra (1024px ou mais), cada mudança vai para a URL; no painel, fica
  // no rascunho até "Filtrar".
  function mudar(novo: Rascunho, atraso = 0) {
    setRascunho(novo);
    if (modoPainel) return;
    clearTimeout(temporizador.current);
    if (atraso) temporizador.current = setTimeout(() => navegar(enderecoDaLoja(paraFiltros(novo))), atraso);
    else navegar(enderecoDaLoja(paraFiltros(novo)));
  }

  useEffect(() => () => clearTimeout(temporizador.current), []);

  function focarCampoDePreco() {
    setAlternados((atuais) => ({ ...atuais, preco: true }));
    requestAnimationFrame(() => painelRef.current?.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus());
  }

  // Enter na busca, "Aplicar" do preço e "Filtrar" do painel.
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (erroDosCamposDePreco(rascunho.precoMinimo, rascunho.precoMaximo, erroDaFaixa)) {
      focarCampoDePreco();
      return;
    }
    navegar(enderecoDaLoja(filtrosDoRascunho));
    setPainelAberto(false);
  }

  // "x", "Cancelar", Esc e o fundo escuro: fecha e descarta o que foi mexido.
  function cancelar() {
    clearTimeout(temporizador.current);
    setRascunho(paraRascunho(filtros));
    setPainelAberto(false);
  }
  const cancelarRef = useRef(cancelar);
  useEffect(() => {
    cancelarRef.current = cancelar;
  });

  // Painel aberto: a página de trás não rola, o foco entra no título e volta
  // ao botão flutuante ao fechar.
  useEffect(() => {
    if (!painelAberto) return;
    const corpo = document.body;
    corpo.style.overflow = "hidden";
    const quadro = requestAnimationFrame(() => tituloRef.current?.focus());
    const aoTeclar = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === "Escape") cancelarRef.current();
    };
    document.addEventListener("keydown", aoTeclar);
    const botao = botaoRef.current;
    return () => {
      cancelAnimationFrame(quadro);
      corpo.style.overflow = "";
      document.removeEventListener("keydown", aoTeclar);
      botao?.focus();
    };
  }, [painelAberto]);

  // O menu da loja fica 16px acima do botão de filtros (até 1023px) e some
  // com o painel aberto.
  useEffect(() => avisarMenu({ painelAberto }), [avisarMenu, painelAberto]);
  useEffect(() => () => avisarMenu(null), [avisarMenu]);

  // Tab e Shift+Tab circulam só entre os controles visíveis do painel.
  function prenderFoco(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== "Tab" || !painelRef.current) return;
    const focaveis = Array.from(painelRef.current.querySelectorAll<HTMLElement>(FOCAVEIS)).filter((elemento) => elemento.checkVisibility({ visibilityProperty: true }));
    if (focaveis.length === 0) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const atual = document.activeElement;
    if (evento.shiftKey && (atual === primeiro || atual === tituloRef.current)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && atual === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }

  // Etiquetas e "Limpar filtros": sem recarregar; o foco vai para a contagem.
  function aoNavegarPelaEtiqueta(evento: MouseEvent<HTMLAnchorElement>, endereco: string) {
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey || evento.button !== 0) return;
    evento.preventDefault();
    const destino = ativos.find((ativo) => enderecoDaLoja(ativo.semEste) === endereco)?.semEste ?? semFiltros(filtros);
    setRascunho(paraRascunho(destino));
    navegar(endereco);
    contagemRef.current?.focus();
  }

  function mudarOrdem(ordem: OrdemDaLoja) {
    setRascunho((atual) => ({ ...atual, ordem }));
    // No painel fechado, a ordem vale sobre os filtros aplicados.
    navegar(enderecoDaLoja(modoPainel ? { ...filtros, ordem } : { ...filtrosDoRascunho, ordem }));
  }

  const ordemDasCategorias = opcoes.categorias.map((opcao) => opcao.valor);
  const ordemDosSelos = opcoes.selos.map((opcao) => opcao.valor);
  const painelVisivel = modoPainel && painelAberto;
  const quantidade = ativos.length;
  const propsDoDialogo = modoPainel ? ({ role: "dialog", "aria-modal": true, "aria-labelledby": idTitulo } as const) : {};

  function conteudoDoGrupo(grupo: Grupo): ReactNode {
    switch (grupo) {
      case "busca":
        return (
          <div className={estilos.busca}>
            <label htmlFor={idBusca} className={estilos.rotulo}>Nome do produto</label>
            <span className={estilos.campoDeBusca}>
              <input
                ref={buscaRef}
                id={idBusca}
                type="search"
                name={PARAMETROS.busca}
                value={rascunho.busca}
                maxLength={LIMITE_DA_BUSCA}
                autoComplete="off"
                enterKeyHint="search"
                onChange={(evento) => mudar({ ...rascunho, busca: evento.target.value }, ATRASO_DA_DIGITACAO_MS)}
                className={estilos.entradaDeBusca}
              />
              {montado && rascunho.busca && (
                <button
                  type="button"
                  className={estilos.limparBusca}
                  aria-label="Limpar busca"
                  onClick={() => {
                    mudar({ ...rascunho, busca: "" });
                    buscaRef.current?.focus();
                  }}
                >
                  <IconeFechar className={estilos.iconePequeno} />
                </button>
              )}
            </span>
          </div>
        );
      case "categoria":
        return opcoes.categorias.map((opcao) => (
          <OpcaoDoFiltro
            key={opcao.valor}
            nome={PARAMETROS.categoria}
            valor={opcao.valor}
            rotulo={opcao.rotulo}
            contagem={contagens.categorias[opcao.valor] ?? 0}
            marcada={rascunho.categorias.includes(opcao.valor)}
            aoMudar={(marcada) => mudar({ ...rascunho, categorias: alternarValor(rascunho.categorias, opcao.valor, marcada, ordemDasCategorias) })}
          />
        ));
      case "tipo":
        return TIPOS.map((opcao) => (
          <OpcaoDoFiltro
            key={opcao.valor}
            nome={PARAMETROS.tipo}
            valor={opcao.valor}
            rotulo={opcao.rotulo}
            contagem={contagens.tipos[opcao.valor]}
            marcada={rascunho.tipos.includes(opcao.valor)}
            aoMudar={(marcada) => mudar({ ...rascunho, tipos: alternarValor(rascunho.tipos, opcao.valor, marcada, TIPOS.map((item) => item.valor)) })}
          />
        ));
      case "disponibilidade":
        return DISPONIBILIDADES.map((opcao) => (
          <OpcaoDoFiltro
            key={opcao.valor}
            nome={PARAMETROS.disponibilidade}
            valor={opcao.valor}
            rotulo={opcao.rotulo}
            contagem={contagens.disponibilidades[opcao.valor]}
            marcada={rascunho.disponibilidades.includes(opcao.valor)}
            aoMudar={(marcada) =>
              mudar({ ...rascunho, disponibilidades: alternarValor(rascunho.disponibilidades, opcao.valor, marcada, DISPONIBILIDADES.map((item) => item.valor)) })
            }
          />
        ));
      case "preco":
        return (
          <FaixaDePreco
            minimo={rascunho.precoMinimo}
            maximo={rascunho.precoMaximo}
            faixa={opcoes.faixaDePreco}
            erro={erroDaFaixa}
            aoMudar={(precoMinimo, precoMaximo) => mudar({ ...rascunho, precoMinimo, precoMaximo }, ATRASO_DA_DIGITACAO_MS)}
            classeDoAplicar={estilos.soForaDoPainel}
          />
        );
      case "ofertas":
        return (
          <>
            <OpcaoDoFiltro
              nome={PARAMETROS.promocao}
              valor="1"
              rotulo="Em promoção"
              contagem={contagens.promocao}
              marcada={rascunho.promocao}
              aoMudar={(promocao) => mudar({ ...rascunho, promocao })}
            />
            {opcoes.selos.map((opcao) => (
              <OpcaoDoFiltro
                key={opcao.valor}
                nome={PARAMETROS.selo}
                valor={opcao.valor}
                rotulo={opcao.rotulo}
                contagem={contagens.selos[opcao.valor] ?? 0}
                marcada={rascunho.selos.includes(opcao.valor)}
                aoMudar={(marcada) => mudar({ ...rascunho, selos: alternarValor(rascunho.selos, opcao.valor, marcada, ordemDosSelos) })}
              />
            ))}
          </>
        );
    }
  }

  return (
    <div className={estilos.loja}>
      <div className={`${estilos.fundo} ${painelVisivel ? estilos.fundoVisivel : ""}`} aria-hidden="true" onClick={cancelar} />
      <div
        ref={painelRef}
        className={`${estilos.painel} ${painelVisivel ? estilos.painelAberto : ""}`}
        inert={modoPainel && !painelAberto}
        onKeyDown={painelVisivel ? prenderFoco : undefined}
        {...propsDoDialogo}
      >
        <form id={idFormulario} method="get" action="/loja" aria-labelledby={idTitulo} noValidate onSubmit={enviar} className={estilos.formulario}>
          <div className={estilos.cabecalho}>
            <h2 ref={tituloRef} id={idTitulo} tabIndex={-1} className={estilos.titulo}>Filtros</h2>
            <div className={`${estilos.acoesDoCabecalho} ${estilos.soNoPainel}`}>
              <Botao variante="link" className={estilos.limparTudo} onClick={() => setRascunho(paraRascunho(semFiltros(filtrosDoRascunho)))}>
                Limpar tudo
              </Botao>
              <button type="button" className={estilos.fechar} aria-label="Fechar filtros" onClick={cancelar}>
                <IconeFechar className={estilos.iconeFechar} />
              </button>
            </div>
          </div>
          <div className={estilos.corpo}>
            {grupos.map((grupo) => (
              <GrupoDoFiltro
                key={grupo}
                titulo={TITULOS[grupo]}
                aberto={estaAberto(grupo)}
                interativo={montado}
                aoAlternar={() => setAlternados((atuais) => ({ ...atuais, [grupo]: !estaAberto(grupo) }))}
              >
                {conteudoDoGrupo(grupo)}
              </GrupoDoFiltro>
            ))}
          </div>
          <div className={estilos.rodape}>
            <Botao type="submit">Filtrar</Botao>
            <Botao variante="secundario" className={estilos.soNoPainel} onClick={cancelar}>
              Cancelar
            </Botao>
          </div>
        </form>
      </div>

      <div className={estilos.resultados}>
        <div className={estilos.barra}>
          <p ref={contagemRef} tabIndex={-1} aria-live="polite" className={estilos.contagem}>
            {total} {total === 1 ? "produto" : "produtos"}
          </p>
          <div className={estilos.ordenar}>
            <label htmlFor={idOrdem} className={estilos.rotulo}>Ordenar por</label>
            <span className={estilos.seletor}>
              <select
                id={idOrdem}
                name={PARAMETROS.ordem}
                form={idFormulario}
                value={rascunho.ordem}
                onChange={(evento) => mudarOrdem(evento.target.value as OrdemDaLoja)}
                className={estilos.selecao}
              >
                {ORDENS.map((ordem) => (
                  <option key={ordem.valor} value={ordem.valor}>{ordem.rotulo}</option>
                ))}
              </select>
              <IconeSeta className={estilos.setaDoSeletor} />
            </span>
            {/* Sem JavaScript, a ordem vale ao enviar o formulário. */}
            <Botao type="submit" form={idFormulario} variante="secundario" className={estilos.soSemJs}>
              Ordenar
            </Botao>
          </div>
        </div>
        {ativos.length > 0 && (
          <EtiquetasDosFiltros
            etiquetas={ativos.map((ativo) => ({ chave: ativo.chave, rotulo: ativo.rotulo, endereco: enderecoDaLoja(ativo.semEste) }))}
            enderecoSemFiltros={enderecoDaLoja(semFiltros(filtros))}
            aoNavegar={aoNavegarPelaEtiqueta}
          />
        )}
        <div className={`${estilos.lista} ${pendente ? estilos.carregando : ""}`} aria-busy={pendente || undefined}>
          {children}
        </div>
        <div className={estilos.lugarDoBotao} data-flutuante-de-filtros="">
          <button
            ref={botaoRef}
            type="button"
            className={estilos.flutuante}
            aria-label={quantidade ? `Abrir filtros, ${quantidade} ${quantidade === 1 ? "filtro ativo" : "filtros ativos"}` : "Abrir filtros"}
            aria-haspopup="dialog"
            aria-expanded={painelAberto}
            inert={painelAberto}
            onClick={() => setPainelAberto(true)}
          >
            <IconeFiltro className={estilos.iconeFiltro} />
            {quantidade > 0 && (
              <span className={estilos.quantidade} aria-hidden="true">
                {quantidade}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
