"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Botao } from "@/components/Botao/Botao";
import { CaixaConsentimento } from "@/components/CaixaConsentimento/CaixaConsentimento";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import estilos from "./BlocoContato.module.css";

type Valores = { nome: string; sobrenome: string; email: string; assunto: string; mensagem: string; consentimento: boolean };
type Erros = Partial<Record<"nome" | "sobrenome" | "email" | "consentimento", string>>;

const VAZIO: Valores = { nome: "", sobrenome: "", email: "", assunto: "", mensagem: "", consentimento: false };

// Na página /componentes, mostra o bloco já com erro ou com sucesso.
export type EstadoInicialContato = "padrao" | "erro" | "sucesso";

// Ordem dos campos: o foco vai para o primeiro com erro.
const ORDEM: (keyof Erros)[] = ["nome", "sobrenome", "email", "consentimento"];

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validar(valores: Valores): Erros {
  const erros: Erros = {};
  if (!valores.nome.trim()) erros.nome = "Informe seu nome.";
  if (!valores.sobrenome.trim()) erros.sobrenome = "Informe seu sobrenome.";
  if (!valores.email.trim()) erros.email = "Informe seu e-mail.";
  else if (!EMAIL_VALIDO.test(valores.email.trim())) erros.email = "Informe um e-mail válido, como nome@exemplo.com.";
  if (!valores.consentimento) erros.consentimento = "Para enviar, marque que você leu e concorda com a Política de Privacidade.";
  return erros;
}

// Bloco "Fale com a ABTE", antes do rodapé em todas as páginas
// (design-system.md seção 8.8 e ABTE_design_redesign.md seção 4.2).
export function BlocoContato({ estadoInicial = "padrao" }: { estadoInicial?: EstadoInicialContato }) {
  const id = useId();
  const [valores, setValores] = useState<Valores>(VAZIO);
  const [erros, setErros] = useState<Erros>(() => (estadoInicial === "erro" ? validar(VAZIO) : {}));
  const [enviado, setEnviado] = useState(estadoInicial === "sucesso");
  const nomeRef = useRef<HTMLInputElement>(null);
  const sobrenomeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const consentimentoRef = useRef<HTMLInputElement>(null);
  const sucessoRef = useRef<HTMLDivElement>(null);
  const [focarSucesso, setFocarSucesso] = useState(false);

  useEffect(() => {
    if (focarSucesso) sucessoRef.current?.focus();
  }, [focarSucesso]);

  function atualizar<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((atuais) => ({ ...atuais, [campo]: valor }));
    // Some com o erro do campo assim que a pessoa corrige.
    if (campo in erros) setErros((atuais) => ({ ...atuais, [campo]: undefined }));
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const novosErros = validar(valores);
    setErros(novosErros);
    const primeiroComErro = ORDEM.find((campo) => novosErros[campo]);
    if (primeiroComErro) {
      const refs = { nome: nomeRef, sobrenome: sobrenomeRef, email: emailRef, consentimento: consentimentoRef };
      refs[primeiroComErro].current?.focus();
      return;
    }
    // TODO: o envio real da mensagem será implementado em outra etapa
    // (serviço de e-mail e local de armazenamento ainda em aberto, ver
    // ABTE_contexto_redesign.md seção 14). Nada é gravado nem enviado agora.
    setEnviado(true);
    setFocarSucesso(true);
  }

  const idTitulo = `${id}-titulo`;

  return (
    <section className={estilos.painel} aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className={estilos.titulo}>
        Fale com a ABTE
      </h2>
      <p className={estilos.aviso}>Campos marcados com * são obrigatórios.</p>
      <form className={estilos.formulario} onSubmit={enviar} noValidate>
        <div className={estilos.linhaDupla}>
          <Campo
            id={`${id}-nome`}
            ref={nomeRef}
            rotulo="Nome"
            obrigatorio
            autoComplete="given-name"
            value={valores.nome}
            onChange={(e) => atualizar("nome", e.target.value)}
            erro={erros.nome}
          />
          <Campo
            id={`${id}-sobrenome`}
            ref={sobrenomeRef}
            rotulo="Sobrenome"
            obrigatorio
            autoComplete="family-name"
            value={valores.sobrenome}
            onChange={(e) => atualizar("sobrenome", e.target.value)}
            erro={erros.sobrenome}
          />
        </div>
        <Campo
          id={`${id}-email`}
          ref={emailRef}
          rotulo="E-mail"
          type="email"
          obrigatorio
          autoComplete="email"
          value={valores.email}
          onChange={(e) => atualizar("email", e.target.value)}
          erro={erros.email}
        />
        <Campo
          id={`${id}-assunto`}
          rotulo="Assunto"
          value={valores.assunto}
          onChange={(e) => atualizar("assunto", e.target.value)}
        />
        <Campo
          id={`${id}-mensagem`}
          rotulo="Mensagem"
          multilinha
          value={valores.mensagem}
          onChange={(e) => atualizar("mensagem", e.target.value)}
        />
        <CaixaConsentimento
          id={`${id}-consentimento`}
          ref={consentimentoRef}
          obrigatorio
          marcado={valores.consentimento}
          aoMudar={(marcado) => atualizar("consentimento", marcado)}
          erro={erros.consentimento}
        >
          Li e concordo com a <Link href="/politica-de-privacidade">Política de Privacidade</Link>
        </CaixaConsentimento>

        {/* Sucesso: mensagem em caixa branca no lugar do botão */}
        {enviado ? (
          <Mensagem tipo="sucesso" ref={sucessoRef}>
            Mensagem enviada. Obrigado por falar com a ABTE.
          </Mensagem>
        ) : (
          <Botao variante="envio" type="submit">
            Enviar
          </Botao>
        )}
      </form>
    </section>
  );
}
