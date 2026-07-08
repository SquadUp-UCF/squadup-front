/**
 * Squad-Up logo, rendered from a PNG image. Drop your file in
 * `src/assets/logo.png` (or change the import below) and it will scale to
 * whatever `size` the caller passes.
 *
 *   <Logo size={28} />
 */
import logoUrl from "../assets/logo.png";

export default function Logo({ size = 28, ...props }) {
  return (
    <img
      src={logoUrl}
      width={size}
      height={size}
      alt="Squad-Up logo"
      style={{ objectFit: "contain", ...props.style }}
      {...props}
    />
  );
}
