type BrandLogoProps = {
  compact?: boolean;
  variant?: "light" | "dark" | "icon";
  className?: string;
  imageClassName?: string;
};

export default function BrandLogo({ compact = false, variant, className = "", imageClassName = "" }: BrandLogoProps) {
  const resolvedVariant = variant || (compact ? "icon" : "light");
  const source = resolvedVariant === "dark"
    ? "/brand/white-logo.png"
    : resolvedVariant === "icon"
      ? "/brand/icon.png"
      : "/brand/logo.png";

  return (
    <img
      src={source}
      alt="Tiwlo"
      className={`block object-contain ${className} ${imageClassName}`}
    />
  );
}
