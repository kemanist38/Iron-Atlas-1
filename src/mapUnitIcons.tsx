type MapUnitDomain = "land" | "naval" | "air";

type Props = {
  domain: MapUnitDomain;
  className?: string;
};

export function MapDomainIcon({
  domain,
  className = "",
}: Props) {
  if (domain === "air") {
    return (
      <g className={`map-domain-icon air ${className}`}>
        <path
          d="M0-8 L2-2 L8 0 L8 2 L2 1 L1 7 L3 9 L3 10 L0 9 L-3 10 L-3 9 L-1 7 L-2 1 L-8 2 L-8 0 L-2-2 Z"
        />
      </g>
    );
  }

  if (domain === "naval") {
    return (
      <g className={`map-domain-icon naval ${className}`}>
        <path d="M-8 2 L-5 6 L5 6 L8 2 Z" />
        <rect x="-4" y="-2" width="8" height="4" rx="1" />
        <rect x="-1" y="-6" width="2" height="4" />
        <path d="M1-6 L5-4 L1-3 Z" />
      </g>
    );
  }

  return (
    <g className={`map-domain-icon land ${className}`}>
      <circle cx="0" cy="-6" r="2.5" />
      <path d="M-3-2 L3-2 L4 4 L2 4 L2 9 L0.5 9 L0 4 L-0.5 4 L-1 9 L-2.5 9 L-2.2 4 L-4 4 Z" />
      <path d="M3-1 L7 2 L6 3 L2 1 Z" />
    </g>
  );
}
