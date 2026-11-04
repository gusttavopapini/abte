import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { Botao } from "@/components/Botao/Botao";
import { papelPodeExecutar } from "@/lib/auth/papeis";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerResumoDoPainel, lerUltimasAlteracoes, type AlteracaoNaTela, type ResumoDoPainel } from "@/lib/dados/painel";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Visão Geral" };

// Atalhos para criar conteúdo (etapa 3, 04/11/2026).
const CRIAR = [
  { href: "/admin/blog/novo", rotulo: "Novo post" },
  { href: "/admin/artigos/novo", rotulo: "Novo artigo" },
  { href: "/admin/profissionais?novo=1", rotulo: "Novo profissional" },
  { href: "/admin/loja/novo", rotulo: "Novo produto" },
];

// Atalhos para as áreas do painel, na ordem do menu.
const AREAS = [
  { href: "/admin/home", titulo: "Home", texto: "Banners do carrossel e imagens das seções da página inicial." },
  { href: "/admin/blog", titulo: "Blog", texto: "Posts publicados e rascunhos, com capa e imagens no texto." },
  { href: "/admin/artigos", titulo: "Artigos", texto: "Artigos científicos, autores, link e imagem." },
  { href: "/admin/profissionais", titulo: "Profissionais", texto: "Diretório de profissionais, com foto e contatos." },
  { href: "/admin/loja", titulo: "Loja", texto: "Produtos, preços, galeria de imagens e categorias." },
  { href: "/admin/midia", titulo: "Mídia", texto: "Todas as imagens do site, onde cada uma é usada e a lixeira." },
];

const QUANDO = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

// Rascunhos e lixeira de cada área, com links para a lista já filtrada.
function linhasDoResumo(resumo: ResumoDoPainel) {
  return [
    { area: "Blog", href: "/admin/blog", rascunhos: { rotulo: "Rascunhos", valor: resumo.posts.rascunhos }, lixeira: resumo.posts.lixeira, publicados: { rotulo: "publicados", valor: resumo.posts.publicados } },
    { area: "Artigos", href: "/admin/artigos", rascunhos: { rotulo: "Rascunhos", valor: resumo.artigos.rascunhos }, lixeira: resumo.artigos.lixeira, publicados: { rotulo: "publicados", valor: resumo.artigos.publicados } },
    { area: "Profissionais", href: "/admin/profissionais", rascunhos: { rotulo: "Ocultos", valor: resumo.profissionais.rascunhos }, lixeira: resumo.profissionais.lixeira, publicados: { rotulo: "ativos", valor: resumo.profissionais.publicados } },
    { area: "Produtos", href: "/admin/loja", rascunhos: { rotulo: "Fora da loja", valor: resumo.produtos.rascunhos }, lixeira: resumo.produtos.lixeira, publicados: { rotulo: "na loja", valor: resumo.produtos.publicados } },
  ];
}

export default async function PaginaPainel() {
  const usuario = await exigirPapelDoPainel();
  const podeVerRegistro = papelPodeExecutar(usuario.papel, "registro.ver");
  let resumo: ResumoDoPainel | null = null;
  let alteracoes: AlteracaoNaTela[] | null = null;
  try {
    [resumo, alteracoes] = await Promise.all([lerResumoDoPainel(), podeVerRegistro ? lerUltimasAlteracoes() : Promise.resolve(null)]);
  } catch (erro) {
    console.error("Falha ao ler a visão geral do painel:", erro);
  }

  return (
    <div className={estilos.pagina}>
      <CabecalhoDoPainel
        titulo="Painel da ABTE"
        descricao="Crie conteúdo, veja o que está em rascunho ou na lixeira e as últimas alterações. Tudo o que é publicado aqui aparece no site; rascunhos e itens ocultos ficam só no painel."
      />

      <section className={estilos.secao} aria-labelledby="titulo-criar">
        <h2 id="titulo-criar" className={estilos.tituloDaSecao}>Criar</h2>
        <ul role="list" className={estilos.criar}>
          {CRIAR.map((item) => (
            <li key={item.href}>
              <Botao href={item.href} variante="secundario">{item.rotulo}</Botao>
            </li>
          ))}
        </ul>
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-situacao">
        <h2 id="titulo-situacao" className={estilos.tituloDaSecao}>Rascunhos e lixeira</h2>
        {!resumo ? (
          <CaixaDoPainel tipo="erro">Não foi possível carregar as contagens agora. Recarregue a página em instantes.</CaixaDoPainel>
        ) : (
          <ul role="list" className={estilos.situacoes}>
            {linhasDoResumo(resumo).map((linha) => (
              <li key={linha.area} className={estilos.situacao}>
                <h3 className={estilos.nomeDaArea}>{linha.area}</h3>
                <p className={estilos.publicados}>{linha.publicados.valor} {linha.publicados.rotulo}</p>
                <p>
                  <Link href={`${linha.href}?situacao=rascunho`} className="realce">
                    {linha.rascunhos.rotulo}: <strong>{linha.rascunhos.valor}</strong>
                  </Link>
                </p>
                <p>
                  <Link href={`${linha.href}?situacao=lixeira`} className="realce">
                    Na lixeira: <strong>{linha.lixeira}</strong>
                  </Link>
                </p>
              </li>
            ))}
            <li className={estilos.situacao}>
              <h3 className={estilos.nomeDaArea}>Mídia</h3>
              <p>
                <Link href="/admin/midia" className="realce">
                  Imagens na lixeira: <strong>{resumo.midiasNaLixeira}</strong>
                </Link>
              </p>
            </li>
          </ul>
        )}
      </section>

      {podeVerRegistro && (
        <section className={estilos.secao} aria-labelledby="titulo-alteracoes">
          <h2 id="titulo-alteracoes" className={estilos.tituloDaSecao}>Últimas alterações</h2>
          {!alteracoes ? (
            <CaixaDoPainel tipo="erro">Não foi possível carregar o registro de alterações agora.</CaixaDoPainel>
          ) : alteracoes.length === 0 ? (
            <CaixaDoPainel>Nenhuma alteração registrada ainda.</CaixaDoPainel>
          ) : (
            <ol className={estilos.alteracoes}>
              {alteracoes.map((alteracao) => (
                <li key={alteracao.id} className={estilos.alteracao}>
                  <span className={estilos.quando}>{alteracao.quando ? QUANDO.format(alteracao.quando) : "Sem data"}</span>
                  <span>
                    <strong>{alteracao.onde}:</strong> {alteracao.resumo}
                  </span>
                  <span className={estilos.quem}>por {alteracao.quem}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <section className={estilos.secao} aria-labelledby="titulo-areas">
        <h2 id="titulo-areas" className={estilos.tituloDaSecao}>Áreas do painel</h2>
        <ul role="list" className={estilos.areas}>
          {AREAS.map((area) => (
            <li key={area.href}>
              <Link href={area.href} className={estilos.area}>
                <span className={estilos.tituloDaArea}>
                  {area.titulo}
                  <span className="seta-para-frente" aria-hidden="true">&nbsp;&rarr;</span>
                </span>
                <span className={estilos.textoDaArea}>{area.texto}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
