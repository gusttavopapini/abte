"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { cadastrarCliente, criarSessaoCliente, type RespostaDoCadastro } from "@/app/loja/acoes-conta";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { SENHA_MINIMA } from "@/lib/loja/cadastro";
import { obterAuthCliente } from "@/lib/firebase/cliente";
import estilos from "./FormularioCadastroLoja.module.css";

// Cadastro de cliente da loja: a conta é criada pelo servidor; depois o
// navegador entra com ela para gerar o cookie de sessão da loja.
export function FormularioCadastroLoja({ destino }: { destino: string }) {
  const router = useRouter();
  const [resposta, setResposta] = useState<RespostaDoCadastro | null>(null);
  const [enviando, setEnviando] = useState(false);
  const resumoRef = useRef<HTMLDivElement>(null);
  const erros = resposta?.erros ?? {};

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const dados = new FormData(evento.currentTarget);
    const resultado = await cadastrarCliente(dados).catch(() => ({ ok: false, mensagem: "Não foi possível criar a conta agora. Tente de novo em instantes." }));
    if (!resultado.ok) {
      setResposta(resultado);
      setEnviando(false);
      requestAnimationFrame(() => resumoRef.current?.focus());
      return;
    }
    // Conta criada: entra com ela. Se o login falhar, a conta continua valendo.
    try {
      const auth = obterAuthCliente();
      const credencial = await signInWithEmailAndPassword(auth, String(dados.get("email")).trim().toLowerCase(), String(dados.get("senha")));
      const sessao = await criarSessaoCliente(await credencial.user.getIdToken());
      await signOut(auth);
      if (sessao.ok) {
        router.replace(destino);
        router.refresh();
        return;
      }
    } catch {
      // Cai na mensagem abaixo.
    }
    router.replace("/loja/entrar?criada=1");
  }

  return (
    <form className={estilos.formulario} onSubmit={enviar} noValidate>
      {resposta && !resposta.ok && <Mensagem tipo="erro" ref={resumoRef}>{resposta.mensagem}</Mensagem>}
      <Campo id="cadastro-nome" name="nome" rotulo="Nome" obrigatorio autoComplete="name" maxLength={80} erro={erros.nome} />
      <Campo id="cadastro-email" name="email" type="email" rotulo="E-mail" obrigatorio autoComplete="email" erro={erros.email} />
      <Campo id="cadastro-senha" name="senha" type="password" rotulo={`Senha (pelo menos ${SENHA_MINIMA} caracteres)`} obrigatorio autoComplete="new-password" erro={erros.senha} />
      <Campo id="cadastro-confirmacao" name="confirmacao" type="password" rotulo="Repita a senha" obrigatorio autoComplete="new-password" erro={erros.confirmacao} />

      {/* Campo escondido de pessoas, para barrar robôs simples. */}
      <div className={estilos.escondido} aria-hidden="true">
        <label htmlFor="cadastro-site">Não preencha</label>
        <input id="cadastro-site" name="site" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={estilos.consentimento}>
        <p id="cadastro-uso-dos-dados">
          Para manter sua conta na loja, a ABTE guarda seu nome, seu e-mail e os itens do seu carrinho. A senha fica com o
          serviço de login (Firebase Authentication) e a ABTE não tem acesso a ela. Você pode excluir a conta, com esses dados,
          quando quiser, em &ldquo;Minha conta&rdquo;. Detalhes na <Link href="/politica-de-privacidade">Política de privacidade</Link>.
        </p>
        <label className={estilos.opcao}>
          <input type="checkbox" name="consentimento" value="sim" required aria-describedby={`cadastro-uso-dos-dados${erros.consentimento ? " cadastro-consentimento-erro" : ""}`} aria-invalid={erros.consentimento ? true : undefined} />
          Li e concordo com o uso dos meus dados descrito acima.
        </label>
        {erros.consentimento && <p id="cadastro-consentimento-erro" className={estilos.erro}>{erros.consentimento}</p>}
      </div>

      <Botao type="submit" disabled={enviando}>{enviando ? "Criando conta…" : "Criar conta"}</Botao>
      <Link href={`/loja/entrar?voltar=${encodeURIComponent(destino)}`} className={estilos.link}>Já tenho conta: entrar</Link>
    </form>
  );
}
