import { CSSProperties } from "react";

type Props = {
  className?: string;
  style?: CSSProperties;
};

export function PlaceholderImagem({ className = "", style }: Props) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: "#000",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: "1.5rem",
        width: "100%",
        height: "100%",
        minHeight: "200px",
        letterSpacing: "0.1em",
        ...style,
      }}
      aria-hidden="true"
    >
      IMAGEM
    </div>
  );
}
