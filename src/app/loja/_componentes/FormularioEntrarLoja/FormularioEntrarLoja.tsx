"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { criarSessaoCliente } from "@/app/loja/acoes-conta";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { mensagemDeErroDoLogin } from "@/lib/auth/erros-do-login";
import { obterAuthCliente } from "@/lib/firebase/cliente";
import { ehEmailValido } from "@/lib/validacao";
import estilos from "./FormularioEntrarLoja.module.css";

// Login do cliente da loja. O navegador só gera o token; a sessão fica no
// cookie da loja, criado pelo servidor.
export function FormularioEntrarLoja({ destino }: { destino: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const senhaRef = useRef<HTMLInputElement>(null);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroGeral(null);
    const novosErros: typeof erros = {};
    if (!email.trim()) novosErros.email = "Informe seu e-mail.";
    else if (!ehEmailValido(email.trim())) novosErros.email = "Informe um e-mail válido, como nome@exemplo.com.";
    if (!senha) novosErros.senha = "Informe sua senha.";
    setErros(novosErros);
    if (novosErros.email) return emailRef.current?.focus();
    if (novosErros.senha) return senhaRef.current?.focus();

    setEnviando(true);
    try {
      const auth = obterAuthCliente();
      const credencial = await signInWithEmailAndPassword(auth, email.trim(), senha);
      const resultado = await criarSessaoCliente(await credencial.user.getIdToken());
      await signOut(auth);
      if (resultado.ok) {
        router.replace(destino);
        router.refresh();
        return;
      }
      setErroGeral(
        resultado.motivo === "nao-cliente"
          ? "Esta conta não é uma conta de cliente da loja. Crie uma conta da loja para continuar."
          : "Não foi possível entrar agora. Tente de novo em alguns minutos.",
      );
    } catch (erro) {
      setErroGeral(mensagemDeErroDoLogin(erro));
    }
    setEnviando(false);
  }

  return (
    <form className={estilos.formulario} onSubmit={entrar} noValidate>
      <Campo id="loja-email" ref={emailRef} rotulo="E-mail" type="email" obrigatorio autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} erro={erros.email} />
      <Campo id="loja-senha" ref={senhaRef} rotulo="Senha" type="password" obrigatorio autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} erro={erros.senha} />
      {erroGeral && <Mensagem tipo="erro">{erroGeral}</Mensagem>}
      <Botao type="submit" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</Botao>
      <Link href="/loja/entrar/recuperar-senha" className={estilos.link}>Esqueci minha senha</Link>
      <Link href={`/loja/cadastro?voltar=${encodeURIComponent(destino)}`} className={estilos.link}>Ainda não tenho conta: criar conta</Link>
    </form>
  );
}
