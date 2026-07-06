/**
 * Squad-Up logo: five people (dot + sweeping arc) arranged in a rotational
 * "aperture" swirl, in blue / orange / green / red / black. Pure SVG so it
 * scales cleanly at any size and inherits none of the surrounding text color.
 *
 *   <Logo size={28} />
 */

// One "person" — a head dot plus a curved body — drawn in the top slot; the
// five copies are just this rotated by 72° increments around the center.
const PEOPLE = [
  { rotate: 0, color: "#F5A623" },   // orange (top)
  { rotate: 72, color: "#159A3C" },  // green
  { rotate: 144, color: "#E11D2A" }, // red
  { rotate: 216, color: "#111111" }, // black
  { rotate: 288, color: "#1E63C8" }, // blue
];

export default function Logo({ size = 28, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Squad-Up logo"
      {...props}
    >
      {PEOPLE.map(({ rotate, color }) => (
        <g key={rotate} transform={`rotate(${rotate} 32 32)`}>
          <circle cx="32" cy="10.5" r="4.7" fill={color} />
          <path
            d="M28.5 18.96 A13.5 13.5 0 0 1 43.05 39.74"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  );
}
