"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { ImagemDoItem, type EscolhaDeImagem } from "@/app/admin/_componentes/ImagemDoItem/ImagemDoItem";
import { excluirBannerDaHome, salvarBannerDaHome, salvarImagemDaSecao, type RespostaDaHome } from "@/app/admin/acoes-home";
import { Botao } from "@/components/Botao/Botao";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { Modal } from "@/components/Modal/Modal";
import type { ImagemNaTela } from "@/lib/midia/tela";
import { LIMITE_DE_BANNERS, LIMITE_DO_ALT_DA_HOME, LIMITE_DO_LINK, PROPORCAO_DO_BANNER, linkEhExterno, nomeDoBanner, type BannerDaHome, type IdentificadorDoEspaco } from "@/lib/site/home";
import estilos from "./HomeAdminClient.module.css";

export type BannerNaTela = BannerDaHome & { nome: string; imagem: ImagemNaTela | null };
export type EspacoNaTela = {
  identificador: IdentificadorDoEspaco;
  nome: string;
  onde: string;
  proporcao: string;
  midiaId: string | null;
  alt: string;
  imagem: ImagemNaTela | null;
};

type Janela = { tipo: "banner"; banner: BannerNaTela | null } | { tipo: "excluir"; banner: BannerNaTela } | { tipo: "espaco"; espaco: EspacoNaTela } | null;

// Chave de um banner novo (também o id do dono das imagens dele).
function novaChave(): string {
  return `banner-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function Miniatura({ imagem, vazio }: { imagem: ImagemNaTela | null; vazio: string }) {
  return (
    <div className={estilos.miniatura}>
      {imagem ? (
        <ImagemDaMidia variantes={imagem.variantes} alt="" largura={imagem.largura} altura={imagem.altura} sizes="(max-width: 767px) 90vw, 320px" className={estilos.imagem} />
      ) : (
        <span className={estilos.semImagem}>{vazio}</span>
      )}
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

function FormularioDoBanner({ banner, total, aoTerminar, aoCancelar }: { banner: BannerNaTela | null; total: number; aoTerminar: (mensagem: string) => void; aoCancelar: () => void }) {
  const id = useId();
  const [resposta, salvar, salvando] = useActionState(salvarBannerDaHome, null);
  const [chave] = useState(() => banner?.chave ?? novaChave());
  const [alt, setAlt] = useState(banner?.alt ?? "");
  // Controlados: um erro na resposta não apaga o que foi digitado.
  const [href, setHref] = useState(banner?.href ?? "");
  const [ativo, setAtivo] = useState(banner ? banner.ativo : true);
  const [temImagem, setTemImagem] = useState(Boolean(banner?.midiaId));
  const ultimoAltSugerido = useRef(banner?.imagem?.alt ?? "");
  // Posição: o banner novo entra no fim.
  const maximo = banner ? total : total + 1;
  const [posicao, setPosicao] = useState(banner?.ordem ?? maximo);
  const resumoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resposta?.ok) aoTerminar(resposta.mensagem);
    else if (resposta) resumoRef.current?.focus();
  }, [resposta, aoTerminar]);

  function aoMudarImagem(escolha: EscolhaDeImagem) {
    setTemImagem(escolha !== null);
    const sugerido = escolha?.imagem?.alt ?? "";
    if (sugerido && (!alt || alt === ultimoAltSugerido.current)) setAlt(sugerido);
    ultimoAltSugerido.current = sugerido;
  }

  const erros = resposta?.ok === false ? resposta.erros ?? {} : {};
  const limitar = (valor: number) => Math.min(Math.max(valor, 1), maximo);

  return (
    <form action={salvar} className={estilos.formulario}>
      <input type="hidden" name="chave" value={chave} />
      {resposta?.ok === false && (
        <Mensagem tipo="erro" ref={resumoRef}>
          {resposta.mensagem}
        </Mensagem>
      )}

      <ImagemDoItem
        nome="midiaId"
        rotulo="Imagem do banner"
        inicial={banner?.midiaId ? { id: banner.midiaId, imagem: banner.imagem } : null}
        dono={{ tipo: "home", id: chave, campo: "banner" }}
        proporcao={PROPORCAO_DO_BANNER}
        erro={erros.midiaId}
        aoMudar={aoMudarImagem}
      />

      <CampoDoAlt id={`${id}-alt`} valor={alt} aoMudar={setAlt} erro={erros.alt} obrigatorio={temImagem} />

      <div className={estilos.grupo}>
        <label htmlFor={`${id}-href`} className={estilos.rotulo}>Link de destino (opcional)</label>
        <p id={`${id}-href-ajuda`} className={estilos.ajuda}>
          Um caminho do site começando com / (ex.: /loja) abre na mesma aba; um endereço completo começando com https:// abre em nova aba. Vazio: o banner não é link.
        </p>
        <input
          id={`${id}-href`}
          name="href"
          type="text"
          inputMode="url"
          value={href}
          onChange={(evento) => setHref(evento.target.value)}
          maxLength={LIMITE_DO_LINK}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={erros.href ? true : undefined}
          aria-describedby={[`${id}-href-ajuda`, erros.href ? `${id}-href-erro` : ""].filter(Boolean).join(" ")}
          className={`${estilos.entrada} ${erros.href ? estilos.entradaComErro : ""}`}
        />
        {erros.href && <p id={`${id}-href-erro`} className={estilos.erro}>{erros.href}</p>}
      </div>

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

  function aoMudarImagem(escolha: EscolhaDeImagem) {
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
      <ImagemDoItem
        nome="midiaId"
        rotulo={`Imagem de "${espaco.nome}"`}
        inicial={espaco.midiaId ? { id: espaco.midiaId, imagem: espaco.imagem } : null}
        dono={{ tipo: "home", id: espaco.identificador, campo: "secao" }}
        proporcao={espaco.proporcao}
        erro={erros.midiaId}
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
export function HomeAdminClient({ banners, espacos }: { banners: BannerNaTela[]; espacos: EspacoNaTela[] }) {
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
                <Miniatura imagem={banner.imagem} vazio={banner.midiaId ? "Imagem fora da biblioteca" : "Sem imagem"} />
                <div className={estilos.texto}>
                  <h3 className={estilos.nome}>{banner.nome}</h3>
                  <p className={estilos.etiquetas}>
                    <span className={estilos.etiqueta}>{banner.chave}</span>
                    <span className={`${estilos.etiqueta} ${banner.ativo ? estilos.ativo : ""}`}>{banner.ativo ? "Ativo" : "Inativo"}</span>
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
              <Miniatura imagem={espaco.imagem} vazio={espaco.midiaId ? "Imagem fora da biblioteca" : "Padrão do site"} />
              <div className={estilos.texto}>
                <h3 className={estilos.nome}>{espaco.nome}</h3>
                <p className={estilos.etiquetas}>
                  <span className={estilos.etiqueta}>{espaco.identificador}</span>
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

      <Modal aberto={janela?.tipo === "banner"} aoFechar={fechar} titulo={janela?.tipo === "banner" ? (janela.banner ? `Editar o ${janela.banner.nome.toLowerCase()}` : "Adicionar banner") : "Banner"} largura="larga">
        {janela?.tipo === "banner" && <FormularioDoBanner banner={janela.banner} total={banners.length} aoTerminar={concluir} aoCancelar={fechar} />}
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
