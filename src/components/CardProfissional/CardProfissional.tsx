import { PlaceholderImagem } from "@/components/PlaceholderImagem/PlaceholderImagem";
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
};

// Card do diretório de profissionais. Sem foto até a biblioteca de mídia
// (etapa 4d): mostra o placeholder no lugar.
export function CardProfissional({ profissional }: { profissional: ProfissionalDoCard }) {
  const { tratamento, nome, registro, metodos, local, telerreabilitacao, whatsapp, instagram, facebook, email, bio } = profissional;
  const nomeCompleto = [tratamento, nome].filter(Boolean).join(" ");
  const novaAba = { target: "_blank", rel: "noopener noreferrer" } as const;

  return (
    <article className={estilos.card}>
      <div className={estilos.cabecalho}>
        <h3 className={estilos.nome}>{nomeCompleto}</h3>
        {registro && <p className={estilos.especialidade}>{registro}</p>}
      </div>
      <div className={estilos.imagemContainer}>
        <PlaceholderImagem />
      </div>
      {metodos.length > 0 && (
        <ul role="list" aria-label="Métodos" className={estilos.metodos}>
          {metodos.map((metodo) => <li key={metodo} className={estilos.metodo}>{metodo}</li>)}
        </ul>
      )}
      {local && <p className={estilos.texto}>{local}</p>}
      {telerreabilitacao && <p className={estilos.texto}>Atende por telerreabilitação</p>}
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
