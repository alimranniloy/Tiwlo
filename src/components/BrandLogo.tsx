type BrandLogoProps = {
  variant?: "light" | "dark" | "icon";
  className?: string;
};

export default function BrandLogo({ variant = "light", className = "" }: BrandLogoProps) {
  const source = variant === "dark"
    ? "/brand/white-logo.png"
    : variant === "icon"
      ? "/brand/icon.png"
      : "/brand/logo.png";

  return (
    <img
      src={source}
      alt="Tiwlo"
      className={`block object-contain ${className}`}
    />
  );
}
