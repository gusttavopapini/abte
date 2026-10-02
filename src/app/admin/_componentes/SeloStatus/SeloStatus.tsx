// Selo de status (publicado ou rascunho) das listas do painel.
// As cores do selo estão fora dos tokens (exceção registrada no CLAUDE.md).
export function SeloStatus({ status }: { status: string }) {
  const publicado = status === "publicado";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        textTransform: "uppercase",
        background: publicado ? "rgba(46, 204, 113, 0.2)" : "rgba(241, 196, 15, 0.2)",
        color: publicado ? "#27ae60" : "#d35400",
      }}
    >
      {status}
    </span>
  );
}
