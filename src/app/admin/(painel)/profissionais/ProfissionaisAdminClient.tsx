"use client";

import { useCallback, useState } from "react";
import { AcoesDoItem } from "@/app/admin/_componentes/AcoesDoItem/AcoesDoItem";
import { BuscaNaTabela } from "@/app/admin/_componentes/BuscaNaTabela/BuscaNaTabela";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { FormularioProfissional, type ProfissionalNaTela } from "@/app/admin/_componentes/FormularioProfissional/FormularioProfissional";
import { MensagensDoPainel, useAvisarNoPainel } from "@/app/admin/_componentes/MensagensDoPainel/MensagensDoPainel";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { CelulaDoPainel, LinhaDoPainel, TabelaPainel } from "@/app/admin/_componentes/TabelaPainel/TabelaPainel";
import { Botao } from "@/components/Botao/Botao";
import { Modal } from "@/components/Modal/Modal";
import estilosDaLixeira from "../listaComLixeira.module.css";

type Props = {
  ativos: ProfissionalNaTela[];
  excluidos: ProfissionalNaTela[];
  podeExcluirDeVez: boolean;
};

// O que se perde ao excluir um profissional de vez (texto da confirmação reforçada).
const PERDAS = [
  "O nome, o registro, os contatos, o local e a apresentação deste profissional.",
  "Ele deixa de existir no painel e não volta ao diretório.",
  "A foto não é apagada: continua na biblioteca de mídia.",
];

function local(profissional: ProfissionalNaTela): string {
  const lugar = [profissional.cidades.join(", "), profissional.uf || profissional.pais].filter(Boolean).join(" / ");
  return profissional.telerreabilitacao ? `${lugar ? `${lugar}, ` : ""}telerreabilitação` : lugar;
}

const nomeCompleto = (profissional: ProfissionalNaTela) => [profissional.tratamento, profissional.nome].filter(Boolean).join(" ");

export function ProfissionaisAdminClient(props: Props) {
  return (
    <MensagensDoPainel>
      <ListaDeProfissionais {...props} />
    </MensagensDoPainel>
  );
}

function ListaDeProfissionais({ ativos, excluidos, podeExcluirDeVez }: Props) {
  const avisar = useAvisarNoPainel();
  // null: fechado; "novo": cadastro; profissional: edição.
  const [editando, setEditando] = useState<ProfissionalNaTela | "novo" | null>(null);
  const fechar = useCallback(() => setEditando(null), []);
  const concluir = useCallback(
    (mensagem: string) => {
      setEditando(null);
      avisar({ tipo: "sucesso", texto: mensagem });
    },
    [avisar],
  );

  const acoes = (profissional: ProfissionalNaTela, naLixeira: boolean) => (
    <AcoesDoItem
      colecao="profissionais"
      id={profissional.id}
      nome={nomeCompleto(profissional)}
      situacao={naLixeira ? "lixeira" : profissional.ativo ? "publicado" : "rascunho"}
      aoEditar={() => setEditando(profissional)}
      hrefNoSite={`/profissionais?tag=${encodeURIComponent(profissional.tipo)}`}
      podeExcluirDeVez={podeExcluirDeVez}
      perdas={PERDAS}
    />
  );

  return (
    <>
      <CabecalhoDoPainel
        trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Profissionais" }]}
        titulo="Profissionais"
        descricao="Diretório de profissionais da ABTE. Só os ativos aparecem em /profissionais. Os que estão na lixeira ficam no fim da página e podem ser restaurados."
        acao={<Botao onClick={() => setEditando("novo")}>Adicionar profissional</Botao>}
      />

      {ativos.length > 0 && (
        <BuscaNaTabela
          tabela="tabela-profissionais"
          rotuloDaBusca="Buscar pelo nome, tipo ou local"
          situacoes={[{ valor: "ativo", rotulo: "Visíveis no site" }, { valor: "oculto", rotulo: "Ocultos" }]}
          total={ativos.length}
          nomeNoSingular="profissional"
          nomeNoPlural="profissionais"
        />
      )}
      <TabelaPainel
        id="tabela-profissionais"
        legenda="Pelo campo Ordem e, no empate, pelo nome."
        colunas={["Nome", "Tipo", "Local", "No site", "Ações"]}
        vazia={ativos.length === 0}
        estadoVazio={
          <>
            <p className="tipo-texto">Nenhum profissional fora da lixeira. Os ativos aparecem em /profissionais.</p>
            <Botao variante="secundario" onClick={() => setEditando("novo")}>Adicionar um profissional</Botao>
          </>
        }
      >
        {ativos.map((profissional) => (
          <LinhaDoPainel key={profissional.id} busca={`${profissional.nome} ${profissional.tipo} ${local(profissional)}`} situacao={profissional.ativo ? "ativo" : "oculto"}>
            <CelulaDoPainel rotulo="Nome" destaque>{nomeCompleto(profissional)}</CelulaDoPainel>
            <CelulaDoPainel rotulo="Tipo">{profissional.tipo}</CelulaDoPainel>
            <CelulaDoPainel rotulo="Local">{local(profissional) || "Sem local"}</CelulaDoPainel>
            <CelulaDoPainel rotulo="No site"><SeloStatus status={profissional.ativo ? "ativo" : "oculto"} /></CelulaDoPainel>
            <CelulaDoPainel rotulo="Ações" acoes>{acoes(profissional, false)}</CelulaDoPainel>
          </LinhaDoPainel>
        ))}
      </TabelaPainel>

      {excluidos.length > 0 && (
        <section className={estilosDaLixeira.lixeira} aria-labelledby="titulo-lixeira-profissionais">
          <h2 id="titulo-lixeira-profissionais" className={estilosDaLixeira.titulo}>Lixeira ({excluidos.length})</h2>
          <TabelaPainel
            legenda={`Profissionais na lixeira não aparecem no site. Restaurar volta o profissional com a situação que ele tinha.${podeExcluirDeVez ? " Excluir de vez não tem volta." : " Só o administrador exclui de vez."}`}
            colunas={["Nome", "Tipo", "Situação", "Ações"]}
            vazia={false}
            estadoVazio={null}
          >
            {excluidos.map((profissional) => (
              <LinhaDoPainel key={profissional.id} busca={profissional.nome}>
                <CelulaDoPainel rotulo="Nome" destaque>{nomeCompleto(profissional)}</CelulaDoPainel>
                <CelulaDoPainel rotulo="Tipo">{profissional.tipo}</CelulaDoPainel>
                <CelulaDoPainel rotulo="Situação"><SeloStatus status="lixeira" /></CelulaDoPainel>
                <CelulaDoPainel rotulo="Ações" acoes>{acoes(profissional, true)}</CelulaDoPainel>
              </LinhaDoPainel>
            ))}
          </TabelaPainel>
        </section>
      )}

      <Modal aberto={editando !== null} aoFechar={fechar} titulo={editando && editando !== "novo" ? "Editar profissional" : "Novo profissional"}>
        {editando !== null && (
          <FormularioProfissional key={editando === "novo" ? "novo" : editando.id} profissional={editando === "novo" ? null : editando} aoSalvar={concluir} aoCancelar={fechar} />
        )}
      </Modal>
    </>
  );
}
