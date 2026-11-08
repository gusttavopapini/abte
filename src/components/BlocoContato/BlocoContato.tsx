"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { enviarMensagemDeContato } from "@/app/contato/acoes";
import { Botao } from "@/components/Botao/Botao";
import { CaixaConsentimento } from "@/components/CaixaConsentimento/CaixaConsentimento";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { LIMITES_DO_CONTATO, ORDEM_DOS_CAMPOS_DO_CONTATO, validarMensagemDeContato, type ErrosDoContato } from "@/lib/contato";
import estilos from "./BlocoContato.module.css";

type Valores = { nome: string; sobrenome: string; email: string; assunto: string; mensagem: string; consentimento: boolean };
type Erros = ErrosDoContato;

const VAZIO: Valores = { nome: "", sobrenome: "", email: "", assunto: "", mensagem: "", consentimento: false };

// Na página /componentes, mostra o bloco já com erro ou com sucesso.
type EstadoInicialContato = "padrao" | "erro" | "sucesso";

// Mesma validação do servidor (src/lib/contato.ts), aqui só como ajuda
// imediata; a que vale é a da ação de servidor.
function validar(valores: Valores): Erros {
  const lido = validarMensagemDeContato(valores);
  return lido.ok ? {} : lido.erros;
}

// Bloco "Fale com a ABTE", antes do rodapé em todas as páginas
// (design-system.md seção 8.8 e ABTE_design_redesign.md seção 4.2).
// "centralizado": título e aviso no centro, como os cabeçalhos das páginas
// internas (na /contato, 29/10/2026); o formulário continua à esquerda.
// politicaPublicada (30/10/2026): sem a Política de privacidade publicada
// em /admin/paginas, o consentimento cita a política sem link (a rota daria 404).
export function BlocoContato({ estadoInicial = "padrao", centralizado = false, politicaPublicada = true }: { estadoInicial?: EstadoInicialContato; centralizado?: boolean; politicaPublicada?: boolean }) {
  const id = useId();
  const [valores, setValores] = useState<Valores>(VAZIO);
  const [erros, setErros] = useState<Erros>(() => (estadoInicial === "erro" ? validar(VAZIO) : {}));
  const [enviado, setEnviado] = useState(estadoInicial === "sucesso");
  const [erroDoEnvio, setErroDoEnvio] = useState<string | null>(null);
  const [enviando, iniciarEnvio] = useTransition();
  const consentimentoRef = useRef<HTMLInputElement>(null);
  const avisoRef = useRef<HTMLDivElement>(null);
  const [focarAviso, setFocarAviso] = useState(0);

  // O foco vai para o aviso (sucesso ou erro do envio) a cada resposta.
  useEffect(() => {
    if (focarAviso) avisoRef.current?.focus();
  }, [focarAviso]);

  function focarPrimeiroComErro(novosErros: Erros) {
    const primeiro = ORDEM_DOS_CAMPOS_DO_CONTATO.find((campo) => novosErros[campo]);
    if (primeiro) document.getElementById(`${id}-${primeiro}`)?.focus();
    return Boolean(primeiro);
  }

  function atualizar<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((atuais) => ({ ...atuais, [campo]: valor }));
    // Some com o erro do campo assim que a pessoa corrige.
    if (campo in erros) setErros((atuais) => ({ ...atuais, [campo]: undefined }));
  }

  // Envio (08/11/2026): a ação de servidor valida de novo e grava em
  // mensagensDeContato; o sucesso só aparece depois de gravar. Na página
  // /componentes (estadoInicial diferente de "padrao"), nada é enviado.
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const novosErros = validar(valores);
    setErros(novosErros);
    setErroDoEnvio(null);
    if (focarPrimeiroComErro(novosErros)) return;
    if (estadoInicial !== "padrao") return;
    iniciarEnvio(async () => {
      let resposta;
      try {
        resposta = await enviarMensagemDeContato(valores);
      } catch {
        resposta = { ok: false, mensagem: "Não foi possível enviar sua mensagem agora. Confira sua conexão e tente de novo." };
      }
      if (resposta.ok) {
        setValores(VAZIO);
        setEnviado(true);
        setFocarAviso((n) => n + 1);
        return;
      }
      if (resposta.erros && Object.keys(resposta.erros).length > 0) {
        setErros(resposta.erros);
        focarPrimeiroComErro(resposta.erros);
        return;
      }
      setErroDoEnvio(resposta.mensagem);
      setFocarAviso((n) => n + 1);
    });
  }

  const idTitulo = `${id}-titulo`;

  return (
    <section className={`${estilos.painel} ${centralizado ? estilos.centralizado : ""}`} aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className={estilos.titulo}>
        Fale com a ABTE
      </h2>
      <p className={estilos.aviso}>Campos marcados com * são obrigatórios.</p>
      <form className={estilos.formulario} onSubmit={enviar} noValidate>
        <div className={estilos.linhaDupla}>
          <Campo
            id={`${id}-nome`}
            rotulo="Nome"
            obrigatorio
            maxLength={LIMITES_DO_CONTATO.nome}
            autoComplete="given-name"
            value={valores.nome}
            onChange={(e) => atualizar("nome", e.target.value)}
            erro={erros.nome}
          />
          <Campo
            id={`${id}-sobrenome`}
            rotulo="Sobrenome"
            obrigatorio
            maxLength={LIMITES_DO_CONTATO.sobrenome}
            autoComplete="family-name"
            value={valores.sobrenome}
            onChange={(e) => atualizar("sobrenome", e.target.value)}
            erro={erros.sobrenome}
          />
        </div>
        <Campo
          id={`${id}-email`}
          rotulo="E-mail"
          type="email"
          obrigatorio
          maxLength={LIMITES_DO_CONTATO.email}
          autoComplete="email"
          value={valores.email}
          onChange={(e) => atualizar("email", e.target.value)}
          erro={erros.email}
        />
        <Campo
          id={`${id}-assunto`}
          rotulo="Assunto"
          maxLength={LIMITES_DO_CONTATO.assunto}
          value={valores.assunto}
          onChange={(e) => atualizar("assunto", e.target.value)}
          erro={erros.assunto}
        />
        <Campo
          id={`${id}-mensagem`}
          rotulo="Mensagem"
          multilinha
          obrigatorio
          maxLength={LIMITES_DO_CONTATO.mensagem}
          value={valores.mensagem}
          onChange={(e) => atualizar("mensagem", e.target.value)}
          erro={erros.mensagem}
        />
        <CaixaConsentimento
          id={`${id}-consentimento`}
          ref={consentimentoRef}
          obrigatorio
          marcado={valores.consentimento}
          aoMudar={(marcado) => atualizar("consentimento", marcado)}
          erro={erros.consentimento}
        >
          Li e concordo com a {politicaPublicada ? <Link href="/politica-de-privacidade">Política de Privacidade</Link> : "Política de Privacidade"}
        </CaixaConsentimento>

        {erroDoEnvio && (
          <Mensagem tipo="erro" ref={avisoRef}>
            {erroDoEnvio}
          </Mensagem>
        )}
        {enviado ? (
          <Mensagem tipo="sucesso" ref={avisoRef}>
            Mensagem enviada. Obrigado por falar com a ABTE.
          </Mensagem>
        ) : (
          <Botao variante="envio" type="submit" aria-disabled={enviando || undefined}>
            {enviando ? "Enviando..." : "Enviar"}
          </Botao>
        )}
      </form>
    </section>
  );
}
