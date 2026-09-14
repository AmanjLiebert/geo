import type { SVGProps } from "react";

export type GeoIconProps = SVGProps<SVGSVGElement>;

function iconProps(className?: string) {
  return {
    viewBox: "0 0 32 32",
    className: `geo-glyph${className ? ` ${className}` : ""}`,
    focusable: "false",
  } as const;
}

export function GeoHomeIcon({ className, ...props }: GeoIconProps) {
  return <svg {...iconProps(className)} {...props}>
    <path className="geo-glyph__line" d="m5 15 11-9 11 9v12H5zM12 27v-8h8v8" />
    <path className="geo-glyph__accent-line" d="M4 15 16 5l12 10" />
  </svg>;
}

export function GeoArchiveIcon({ className, ...props }: GeoIconProps) {
  return <svg {...iconProps(className)} {...props}>
    <path className="geo-glyph__line" d="M6 11h20v16H6zM4 6h24v6H4zM12 17h8" />
    <path className="geo-glyph__accent-line" d="M9 23h14" />
  </svg>;
}

export function GeoMapIcon({ className, ...props }: GeoIconProps) {
  return <svg {...iconProps(className)} {...props}>
    <path className="geo-glyph__line" d="m4 8 8-3 8 3 8-3v19l-8 3-8-3-8 3zM12 5v19M20 8v19" />
    <path className="geo-glyph__accent-line" d="M7 17c2-1 3-1 5 0m8-2c3-2 5-2 8-1" />
  </svg>;
}

export function GeoResearchIcon({ className, ...props }: GeoIconProps) {
  return <svg {...iconProps(className)} {...props}>
    <path className="geo-glyph__line" d="M7 4h13l6 6v18H7zM20 4v6h6M12 16h9M12 21h9" />
    <path className="geo-glyph__accent-line" d="M12 25h6" />
  </svg>;
}

export function GeoNotebookIcon({ className, ...props }: GeoIconProps) {
  return <svg {...iconProps(className)} {...props}>
    <path className="geo-glyph__line" d="M8 4h18v24H8zM13 10h8M13 16h8M13 22h6" />
    <path className="geo-glyph__accent-line" d="M8 4v24M5 9h6M5 16h6M5 23h6" />
  </svg>;
}

export function GeoTagIcon({ className, ...props }: GeoIconProps) {
  return <svg {...iconProps(className)} {...props}>
    <path className="geo-glyph__line" d="M4 6h14l10 10-11 11L4 14z" />
    <circle className="geo-glyph__line" cx="10" cy="12" r="2.5" />
    <path className="geo-glyph__accent-line" d="m16 15 6 6" />
  </svg>;
}

export function GeoRockIcon({ className, ...props }: GeoIconProps) {
  return <svg {...iconProps(className)} {...props}>
    <path className="geo-glyph__line" d="m4 24 4-13 8-7 9 6 3 14-7 4H10zM8 11l8 6 9-7M16 17l5 11" />
    <path className="geo-glyph__accent-line" d="m4 24 8-4 4-3" />
  </svg>;
}

export function GeoSearchIcon({ className, ...props }: GeoIconProps) {
  return <svg {...iconProps(className)} {...props}>
    <circle className="geo-glyph__line" cx="14" cy="14" r="8.5" />
    <path className="geo-glyph__accent-line" d="m20.5 20.5 7 7" />
  </svg>;
}

export function GeoMenuIcon({ className, ...props }: GeoIconProps) {
  return <svg {...iconProps(className)} {...props}>
    <path className="geo-glyph__line" d="M5 8h22M5 16h22M5 24h22" />
    <path className="geo-glyph__accent-line" d="M5 16h8" />
  </svg>;
}

export function GeoCloseIcon({ className, ...props }: GeoIconProps) {
  return <svg {...iconProps(className)} {...props}>
    <path className="geo-glyph__line" d="m7 7 18 18" />
    <path className="geo-glyph__accent-line" d="M25 7 7 25" />
  </svg>;
}

export function GeoBackIcon({ className, ...props }: GeoIconProps) {
  return <svg {...iconProps(className)} {...props}>
    <path className="geo-glyph__line" d="M7 16h21" />
    <path className="geo-glyph__accent-line" d="m14 8-8 8 8 8" />
  </svg>;
}

export function GeoFilterIcon({ className, ...props }: GeoIconProps) {
  return <svg {...iconProps(className)} {...props}>
    <path className="geo-glyph__line" d="M4 6h24l-9 11v8l-6 3V17z" />
    <path className="geo-glyph__accent-line" d="M8 11h16" />
  </svg>;
}

export function GeoChevronIcon({ className, ...props }: GeoIconProps) {
  return <svg {...iconProps(className)} {...props}>
    <path className="geo-glyph__line" d="m7 11 9 9 9-9" />
    <path className="geo-glyph__accent-line" d="M11 11h14" />
  </svg>;
}
