"use client";

import { useCallback, useState } from "react";
import { AcoesDoItem } from "@/app/admin/_componentes/AcoesDoItem/AcoesDoItem";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { FormularioProfissional, type ProfissionalNaTela } from "@/app/admin/_componentes/FormularioProfissional/FormularioProfissional";
import { MensagensDoPainel, useAvisarNoPainel } from "@/app/admin/_componentes/MensagensDoPainel/MensagensDoPainel";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { ListaDoPainel, type ItemDaLista, type OrdenacaoDaLista } from "@/app/admin/_componentes/ListaDoPainel/ListaDoPainel";
import { Botao } from "@/components/Botao/Botao";
import { Modal } from "@/components/Modal/Modal";

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

const ORDENACOES: OrdenacaoDaLista[] = [
  { valor: "site", rotulo: "Ordem do site", chave: "ordem", direcao: "asc" },
  { valor: "nome", rotulo: "Nome, de A a Z", chave: "nome", direcao: "asc" },
  { valor: "nome-inverso", rotulo: "Nome, de Z a A", chave: "nome", direcao: "desc" },
  { valor: "tipo", rotulo: "Tipo", chave: "tipo", direcao: "asc" },
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

  const itens: ItemDaLista[] = [...ativos.map((profissional) => ({ profissional, naLixeira: false })), ...excluidos.map((profissional) => ({ profissional, naLixeira: true }))].map(({ profissional, naLixeira }, indice) => {
    const situacao = naLixeira ? "lixeira" : profissional.ativo ? "publicado" : "rascunho";
    return {
      id: profissional.id,
      nome: nomeCompleto(profissional),
      busca: `${profissional.tipo} ${local(profissional)}`,
      situacao,
      // A ordem que chega do servidor já é a do site (Ordem e, no empate, o nome).
      chaves: { ordem: indice, nome: profissional.nome, tipo: profissional.tipo },
      celulas: [
        nomeCompleto(profissional),
        profissional.tipo,
        local(profissional) || "Sem local",
        <SeloStatus key="situacao" status={naLixeira ? "lixeira" : profissional.ativo ? "ativo" : "oculto"} />,
      ],
      acoes: acoes(profissional, naLixeira),
    };
  });

  return (
    <>
      <CabecalhoDoPainel
        trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Profissionais" }]}
        titulo="Profissionais"
        descricao={`Diretório de profissionais da ABTE. Só os ativos aparecem em /profissionais; restaurados da lixeira, voltam com a situação que tinham.${podeExcluirDeVez ? "" : " Só o administrador exclui de vez."}`}
        acao={<Botao onClick={() => setEditando("novo")}>Adicionar profissional</Botao>}
      />

      <ListaDoPainel
        colecao="profissionais"
        itens={itens}
        colunas={["Nome", "Tipo", "Local", "No site"]}
        ordenacoes={ORDENACOES}
        rotulos={{ singular: "profissional", plural: "profissionais", publicados: "Ativos", rascunhos: "Ocultos" }}
        rotuloDaBusca="Buscar pelo nome, tipo ou local"
        comSituacao
        estadoVazio={
          <>
            <p className="tipo-texto">Nenhum profissional cadastrado. Os ativos aparecem em /profissionais.</p>
            <Botao variante="secundario" onClick={() => setEditando("novo")}>Adicionar o primeiro profissional</Botao>
          </>
        }
      />

      <Modal aberto={editando !== null} aoFechar={fechar} titulo={editando && editando !== "novo" ? "Editar profissional" : "Novo profissional"}>
        {editando !== null && (
          <FormularioProfissional key={editando === "novo" ? "novo" : editando.id} profissional={editando === "novo" ? null : editando} aoSalvar={concluir} aoCancelar={fechar} />
        )}
      </Modal>
    </>
  );
}
