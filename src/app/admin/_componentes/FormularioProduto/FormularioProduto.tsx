"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useId, useRef, type FormEvent } from "react";
import Link from "next/link";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { salvarProduto, type RespostaDoProduto } from "@/app/admin/acoes-produtos";
import { GaleriaDeMidia, type ItemDaGaleria } from "@/app/admin/_componentes/GaleriaDeMidia/GaleriaDeMidia";
import type { Produto } from "@/lib/dados/tipos";
import { LIMITE_DE_IMAGENS_DO_PRODUTO, precoParaCampo } from "@/lib/produtos";
import estilos from "./FormularioProduto.module.css";

// Produto como a tela do painel recebe (sem datas), com a galeria já montada
// no servidor (imagens na ordem; imagem null: foi para a lixeira).
export type ProdutoNaTela = Omit<Produto, "criadoEm" | "atualizadoEm" | "excluidoEm" | "imagens"> & { galeria: ItemDaGaleria[] };

type Props = {
  produto: ProdutoNaTela | null;
  // Categorias de produto fora da lixeira.
  categorias: { id: string; nome: string }[];
};

function ErroDoCampo({ id, erro }: { id: string; erro?: string }) {
  if (!erro) return null;
  return <p id={id} className={estilos.erro}>{erro}</p>;
}

// Cadastro e edição de produto, com a galeria de imagens da biblioteca de mídia.
export function FormularioProduto({ produto, categorias }: Props) {
  const router = useRouter();
  const [resposta, acao, salvando] = useActionState<RespostaDoProduto | null, FormData>(salvarProduto, null);
  const id = useId();
  const resumoRef = useRef<HTMLDivElement>(null);
  const erros = resposta?.ok === false ? resposta.erros ?? {} : {};
  const p = produto;

  useEffect(() => {
    if (!resposta) return;
    if (resposta.ok) router.push("/admin/loja?salvo=1");
    else resumoRef.current?.focus();
  }, [resposta, router]);

  // Envio sem limpar o formulário: com erro, o que foi digitado continua.
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => acao(dados));
  }

  const descrito = (campo: string, temErro: boolean) => (temErro ? `${id}-${campo}-erro` : undefined);

  return (
    <form onSubmit={enviar} className={estilos.formulario} noValidate>
      {p && <input type="hidden" name="id" value={p.id} />}
      {resposta?.ok === false && <Mensagem tipo="erro" ref={resumoRef}>{resposta.mensagem}</Mensagem>}

      <Campo id={`${id}-nome`} name="nome" rotulo="Nome" obrigatorio maxLength={120} defaultValue={p?.nome} erro={erros.nome} />
      {p && <p className={estilos.nota}>Endereço: /loja/produto/{p.slug} (não muda ao renomear)</p>}

      <Campo id={`${id}-descricao`} name="descricao" rotulo="Descrição" multilinha maxLength={5000} defaultValue={p?.descricao} erro={erros.descricao} />

      <div className={estilos.linha}>
        <Campo id={`${id}-preco`} name="preco" rotulo="Preço (R$)" obrigatorio inputMode="decimal" placeholder="25,90" defaultValue={p ? precoParaCampo(p.preco) : ""} erro={erros.preco} />
        <Campo id={`${id}-promocional`} name="precoPromocional" rotulo="Preço promocional (R$, opcional)" inputMode="decimal" defaultValue={p ? precoParaCampo(p.precoPromocional) : ""} erro={erros.precoPromocional} />
      </div>

      <div className={estilos.grupo}>
        <label htmlFor={`${id}-categoria`} className={estilos.rotulo}>Categoria <span aria-hidden="true">*</span></label>
        <select id={`${id}-categoria`} name="categoria" defaultValue={p?.categoria ?? ""} className={estilos.selecao} aria-invalid={erros.categoria ? true : undefined} aria-describedby={`${id}-categoria-ajuda ${descrito("categoria", !!erros.categoria) ?? ""}`.trim()}>
          <option value="">Selecione uma categoria...</option>
          {categorias.map(({ id: idCategoria, nome }) => <option key={idCategoria} value={idCategoria}>{nome}</option>)}
        </select>
        <p id={`${id}-categoria-ajuda`} className={estilos.nota}>
          {categorias.length === 0 ? "Nenhuma categoria cadastrada ainda. " : "Para criar ou renomear categorias, use "}
          <Link href="/admin/loja/categorias">{categorias.length === 0 ? "Cadastre em Loja: categorias" : "Loja: categorias"}</Link>.
        </p>
        <ErroDoCampo id={`${id}-categoria-erro`} erro={erros.categoria} />
      </div>

      <div className={estilos.linha}>
        <fieldset className={estilos.grupoSemMoldura} aria-describedby={descrito("tipo", !!erros.tipo)}>
          <legend className={estilos.rotulo}>Tipo</legend>
          <label className={estilos.opcao}><input type="radio" name="tipo" value="fisico" defaultChecked={(p?.tipo ?? "fisico") === "fisico"} /> Físico</label>
          <label className={estilos.opcao}><input type="radio" name="tipo" value="digital" defaultChecked={p?.tipo === "digital"} /> Digital</label>
          <ErroDoCampo id={`${id}-tipo-erro`} erro={erros.tipo} />
        </fieldset>
        <fieldset className={estilos.grupoSemMoldura} aria-describedby={descrito("status", !!erros.status)}>
          <legend className={estilos.rotulo}>Situação</legend>
          <label className={estilos.opcao}><input type="radio" name="status" value="disponivel" defaultChecked={(p?.status ?? "disponivel") === "disponivel"} /> Disponível</label>
          <label className={estilos.opcao}><input type="radio" name="status" value="esgotado" defaultChecked={p?.status === "esgotado"} /> Esgotado</label>
          <ErroDoCampo id={`${id}-status-erro`} erro={erros.status} />
        </fieldset>
      </div>

      <div className={estilos.linha}>
        <Campo id={`${id}-selo`} name="selo" rotulo="Selo (opcional, ex.: Monte seu kit)" maxLength={30} defaultValue={p?.selo} erro={erros.selo} />
        <Campo id={`${id}-ordem`} name="ordem" type="number" min={0} max={999} rotulo="Ordem na loja (menor aparece antes)" defaultValue={p?.ordem ?? 0} erro={erros.ordem} />
      </div>

      <label className={estilos.opcao}>
        <input type="checkbox" name="publicado" value="sim" defaultChecked={p ? p.publicado : false} />
        Publicado (aparece na loja)
      </label>

      <GaleriaDeMidia nome="imagens" rotulo="Imagens do produto" inicial={p?.galeria ?? []} limite={LIMITE_DE_IMAGENS_DO_PRODUTO} erro={erros.imagens} />

      <div className={estilos.botoes}>
        <Botao href="/admin/loja" variante="secundario">Cancelar</Botao>
        <Botao type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Botao>
      </div>
    </form>
  );
}
