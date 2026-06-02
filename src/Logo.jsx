export default function Logo({ width = 200, className = "" }) {
  return (
    <img
      src="/logo.png"
      width={width}
      style={{ height: "auto", display: "block" }}
      alt="Mamá CEO App"
      className={className}
    />
  );
}
