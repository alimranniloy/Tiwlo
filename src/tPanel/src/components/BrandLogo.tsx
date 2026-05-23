type BrandLogoProps = {
  compact?: boolean;
  className?: string;
  imageClassName?: string;
};

export default function BrandLogo({ compact = false, className = "", imageClassName = "" }: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center justify-center overflow-hidden rounded-lg bg-white ${className}`}>
      <img
        src={compact ? "/brand/icon.png" : "/brand/logo.png"}
        alt="Tiwlo"
        className={`${compact ? "h-full w-full object-contain p-1" : "h-full w-full object-contain"} ${imageClassName}`}
      />
    </div>
  );
}
