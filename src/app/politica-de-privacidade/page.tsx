import type { Metadata } from "next";
import Link from "next/link";
import { PaginaDeTexto } from "@/components/PaginaDeTexto/PaginaDeTexto";
import { EMAIL_CONTATO } from "@/config/navegacao";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Versão preliminar: o que o site da ABTE faz hoje com os dados de quem o visita.",
};

// VERSÃO PRELIMINAR, em revisão pela ABTE e pela assessoria jurídica.
// Descreve só o que o código faz hoje. Sem base legal, prazos, encarregado
// ou outras afirmações jurídicas (pendências no CLAUDE.md). Ao mudar o
// texto definitivo, trocar VERSAO_DO_CONSENTIMENTO em src/lib/loja/contas.ts.
export default function PaginaPoliticaDePrivacidade() {
  return (
    <PaginaDeTexto
      preliminar
      titulo="Política de privacidade"
      introducao={
        <p>
          Este texto descreve o que o site da ABTE faz hoje com os dados de quem o visita. Ele ainda não é a política definitiva:
          está em revisão pela ABTE e será completado com orientação jurídica.
        </p>
      }
    >
      <section>
        <h2>Navegação no site</h2>
        <p>
          Para ler o conteúdo do site não é preciso se cadastrar. O site não usa ferramentas de estatística de visitas nem de
          publicidade.
        </p>
        <p>
          Algumas imagens de exemplo, provisórias, são carregadas de um serviço externo (picsum.photos), e capas antigas de
          posts do blog podem vir de outros sites. Para mostrar essas imagens, o seu navegador se conecta a esses serviços.
        </p>
      </section>

      <section>
        <h2>Formulário de contato</h2>
        <p>
          O formulário pede nome, sobrenome, e-mail, assunto e mensagem, além da confirmação de que você leu esta política. Por
          enquanto, o formulário ainda não envia nem guarda as mensagens: o que você digita fica só no seu navegador. Para falar
          com a ABTE agora, escreva para <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>.
        </p>
      </section>

      <section>
        <h2>Conta na loja</h2>
        <p>
          Quem cria uma conta na loja informa nome, e-mail e senha. A ABTE guarda o nome, o e-mail, a data e a versão do aceite
          feito no cadastro e os produtos e quantidades colocados no carrinho. A senha fica com o serviço de login (Firebase
          Authentication, do Google) e a ABTE não tem acesso a ela.
        </p>
        <p>
          A loja não recebe pagamentos e não pede dados de cartão, endereço ou documento. Se você pedir a recuperação de senha, o
          serviço de login envia uma mensagem para o e-mail informado.
        </p>
        <p>
          A conta pode ser excluída a qualquer momento em <Link href="/loja/conta">Minha conta</Link>. A exclusão apaga o login,
          os dados do cadastro e o carrinho.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>O site cria só dois cookies, os dois necessários para manter uma sessão aberta depois de entrar com e-mail e senha:</p>
        <ul>
          <li>
            <strong>abte_cliente</strong>: criado quando você entra na sua conta da loja. Mantém a sessão por até 5 dias, é
            enviado só às páginas da loja e não pode ser lido pelos scripts da página. Sair da conta apaga o cookie.
          </li>
          <li>
            <strong>__session</strong>: usado só pela equipe que mantém o site, ao entrar no painel administrativo. Mantém a
            sessão por até 5 dias e é enviado só às páginas do painel.
          </li>
        </ul>
        <p>
          No momento do login, o navegador se comunica com o serviço de login do Google para conferir o e-mail e a senha.
        </p>
      </section>

      <section>
        <h2>Serviços usados pelo site</h2>
        <ul>
          <li>Vercel: hospedagem do site, que recebe cada acesso para entregar as páginas.</li>
          <li>Firebase Authentication, do Google: login das contas da loja e da equipe do site.</li>
          <li>Cloud Firestore, do Google: banco de dados com o conteúdo do site, o cadastro da loja e os carrinhos.</li>
          <li>Cloud Storage para Firebase, do Google: guarda as imagens do site, que o seu navegador baixa direto de lá.</li>
        </ul>
      </section>

      <section>
        <h2>O que ainda será definido</h2>
        <p>
          Depois da revisão jurídica, esta página vai informar a finalidade e a base legal de cada dado, por quanto tempo os dados
          são guardados, como pedir acesso, correção ou exclusão de dados, o contato do encarregado de dados da ABTE, as regras
          para menores de idade e o local onde os dados ficam armazenados.
        </p>
        <p>
          Dúvidas sobre os seus dados: <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>.
        </p>
      </section>
    </PaginaDeTexto>
  );
}
