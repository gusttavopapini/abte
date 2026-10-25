import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
import type { ImagemNaTela } from "@/lib/midia/tela";
import estilos from "./CardProfissional.module.css";

// Dados que o card mostra (já validados e padronizados no painel).
export type ProfissionalDoCard = {
  tratamento: string;
  nome: string;
  registro: string;
  metodos: string[];
  // Cidades, UF ou país, já em texto (ex.: "Cidade Um, Cidade Dois / SP").
  local: string;
  telerreabilitacao: boolean;
  whatsapp: string;
  instagram: string;
  facebook: string;
  email: string;
  bio: string;
  // Foto da biblioteca de mídia; null sem foto ou com a imagem na lixeira.
  foto: ImagemNaTela | null;
};

// Largura do card na grade de /profissionais (1, 2 e 4 colunas), para o
// navegador escolher a variante da foto.
const LARGURA_DA_FOTO = "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw";

// Card do diretório de profissionais. Com foto, mostra a imagem da biblioteca
// (texto alternativo cadastrado nela); sem foto, o placeholder.
export function CardProfissional({ profissional }: { profissional: ProfissionalDoCard }) {
  const { tratamento, nome, registro, metodos, local, telerreabilitacao, whatsapp, instagram, facebook, email, bio, foto } = profissional;
  const nomeCompleto = [tratamento, nome].filter(Boolean).join(" ");
  const novaAba = { target: "_blank", rel: "noopener noreferrer" } as const;

  // Ordem fixa (padronização de 25/10/2026): foto, nome, registro, local,
  // métodos, apresentação e, no fim do card, os contatos. Nada é escondido:
  // com apresentação longa, o card cresce e os da mesma linha acompanham.
  return (
    <article className={estilos.card}>
      <div className={estilos.imagemContainer}>
        {foto ? (
          <ImagemDaMidia variantes={foto.variantes} alt={foto.alt} largura={foto.largura} altura={foto.altura} sizes={LARGURA_DA_FOTO} className={estilos.imagem} />
        ) : (
          <PlaceholderImagem />
        )}
      </div>
      <div className={estilos.cabecalho}>
        <h3 className={estilos.nome}>{nomeCompleto}</h3>
        {registro && <p className={estilos.especialidade}>{registro}</p>}
      </div>
      {local && <p className={estilos.texto}>{local}</p>}
      {telerreabilitacao && <p className={estilos.texto}>Atende por telerreabilitação</p>}
      {metodos.length > 0 && (
        <ul role="list" aria-label="Métodos" className={estilos.metodos}>
          {metodos.map((metodo) => <li key={metodo} className={estilos.metodo}>{metodo}</li>)}
        </ul>
      )}
      {bio && <p className={estilos.texto}>{bio}</p>}
      <ul role="list" aria-label={`Contatos de ${nomeCompleto}`} className={estilos.contatos}>
        {whatsapp && (
          <li>
            <a href={`https://wa.me/${whatsapp}`} {...novaAba} className={`${estilos.contato} ${estilos.contatoPrincipal}`}>
              WhatsApp<span className="somente-leitor"> (abre em nova aba)</span>
            </a>
          </li>
        )}
        {instagram && (
          <li>
            <a href={`https://www.instagram.com/${instagram}/`} {...novaAba} className={estilos.contato}>
              Instagram<span className="somente-leitor"> (abre em nova aba)</span>
            </a>
          </li>
        )}
        {facebook && (
          <li>
            <a href={facebook} {...novaAba} className={estilos.contato}>
              Facebook<span className="somente-leitor"> (abre em nova aba)</span>
            </a>
          </li>
        )}
        {email && (
          <li>
            <a href={`mailto:${email}`} className={estilos.contato}>E-mail</a>
          </li>
        )}
      </ul>
    </article>
  );
}
