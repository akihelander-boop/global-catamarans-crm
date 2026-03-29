/**
 * Brand assets sourced to match globalcatamarans.com.
 * Replace files in /public/brand/ if you ship updated logos locally.
 */
const src = {
  /** For dark blue / gradient backgrounds (header on main site). */
  onDark: "/brand/gclogo-light.png",
  /** For light backgrounds (cards, paper). */
  onLight: "/brand/gc-logo-dark-on-light.png",
} as const;

export type BrandLogoVariant = keyof typeof src;

export function BrandLogo({
  variant,
  className = "",
}: {
  variant: BrandLogoVariant;
  /** Tailwind classes; set height (e.g. h-10) — width follows aspect ratio */
  className?: string;
}) {
  return (
    <img
      src={src[variant]}
      alt="Global Catamarans"
      className={`w-auto object-contain object-left ${className}`}
      decoding="async"
    />
  );
}
