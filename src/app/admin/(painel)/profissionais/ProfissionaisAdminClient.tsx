"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal/Modal";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Rotulo } from "@/components/Rotulo/Rotulo";
import { salvarProfissional, atualizarProfissional, excluirProfissional } from "@/app/admin/acoes-conteudo";

type Profissional = {
  id: string;
  nome: string;
  especialidade: string;
  tag: string;
  linkedinUrl: string;
  imagemUrl: string;
  status: string;
  criadoEm?: { toDate?: () => Date };
};

type Props = {
  profissionaisIniciais: Profissional[];
};

export function ProfissionaisAdminClient({ profissionaisIniciais }: Props) {
  const [profissionais, setProfissionais] = useState(profissionaisIniciais);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Profissional | null>(null);
  const [salvando, setSalvando] = useState(false);

  const abrirNovo = () => {
    setEditando(null);
    setModalAberto(true);
  };

  const abrirEdicao = (prof: Profissional) => {
    setEditando(prof);
    setModalAberto(true);
  };

  const handleExcluir = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este profissional?")) {
      await excluirProfissional(id);
      setProfissionais(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSalvando(true);
    const formData = new FormData(e.currentTarget);
    formData.append("acao", "publicar"); // Forçamos publicar para não complicar o modal, ou você pode adicionar opções.
    
    if (editando) {
      formData.append("id", editando.id);
      await atualizarProfissional(formData);
    } else {
      await salvarProfissional(formData);
    }
    
    setModalAberto(false);
    setSalvando(false);
    
    // Atualização otimista na tela ou pode usar useTransition
    // Recarregar a página ou o componente em uma aplicação real pode ser feito pelo Next router
    window.location.reload(); 
  };

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-32)" }}>
        <div>
          <h1 className="tipo-h3" style={{ marginBottom: "var(--space-8)" }}>Profissionais</h1>
          <p className="tipo-texto">Gerencie o diretório de profissionais da ABTE.</p>
        </div>
        <Botao onClick={abrirNovo}>Adicionar Novo</Botao>
      </header>
      
      <div style={{ background: "var(--color-surface-soft)", padding: "var(--space-24)", borderRadius: "5px" }}>
        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)" }}>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Nome</th>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Especialidade</th>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Tag</th>
              <th style={{ paddingBottom: "var(--space-16)", fontWeight: 500 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {profissionais.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ paddingTop: "var(--space-24)", textAlign: "center", opacity: 0.7 }}>
                  Nenhum profissional encontrado.
                </td>
              </tr>
            ) : (
              profissionais.map((prof) => (
                <tr key={prof.id} style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-text) 5%, transparent)" }}>
                  <td style={{ padding: "var(--space-16) 0", fontWeight: 500 }}>{prof.nome}</td>
                  <td style={{ padding: "var(--space-16) 0" }}>{prof.especialidade}</td>
                  <td style={{ padding: "var(--space-16) 0", opacity: 0.8 }}>{prof.tag}</td>
                  <td style={{ padding: "var(--space-16) 0", display: "flex", gap: "var(--space-16)" }}>
                    <button onClick={() => abrirEdicao(prof)} style={{ fontSize: "14px", textDecoration: "underline", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer" }}>
                      Editar
                    </button>
                    <button onClick={() => handleExcluir(prof.id)} style={{ fontSize: "14px", textDecoration: "underline", color: "#e74c3c", background: "none", border: "none", cursor: "pointer" }}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal 
        aberto={modalAberto} 
        aoFechar={() => setModalAberto(false)} 
        titulo={editando ? "Editar Profissional" : "Novo Profissional"}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
          <Campo id="nome" name="nome" type="text" rotulo="Nome Completo" obrigatorio defaultValue={editando?.nome || ""} placeholder="Ex: Dra. Maria Silva" style={{ border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)" }} />
          
          <Campo id="especialidade" name="especialidade" type="text" rotulo="Especialidade (Exibição)" obrigatorio defaultValue={editando?.especialidade || ""} placeholder="Ex: Ortopedista Pediátrico" style={{ border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label htmlFor="tag" style={{ fontWeight: 500, fontSize: "14px" }}>Tag (Filtro do site) *</label>
            <select id="tag" name="tag" required defaultValue={editando?.tag || "Fisioterapeutas"} style={{ padding: "12px", border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)", borderRadius: "4px", background: "var(--color-surface)", color: "var(--color-text)", fontSize: "16px" }}>
              <option value="Fisioterapeutas">Fisioterapeutas</option>
              <option value="Médicos">Médicos</option>
              <option value="Ortesistas">Ortesistas</option>
              <option value="Psicólogos">Psicólogos</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <Campo id="linkedinUrl" name="linkedinUrl" type="url" rotulo="URL do LinkedIn" defaultValue={editando?.linkedinUrl || ""} placeholder="https://linkedin.com/in/..." style={{ border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)" }} />

          <Campo id="imagemUrl" name="imagemUrl" type="url" rotulo="URL da Foto (Opcional)" defaultValue={editando?.imagemUrl || ""} placeholder="https://..." style={{ border: "1px solid color-mix(in srgb, var(--color-text) 20%, transparent)" }} />

          <div style={{ marginTop: "var(--space-16)", display: "flex", justifyContent: "flex-end", gap: "var(--space-24)" }}>
            <Botao type="button" variante="secundario" onClick={() => setModalAberto(false)}>Cancelar</Botao>
            <Botao type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Botao>
          </div>
        </form>
      </Modal>
    </div>
  );
}
