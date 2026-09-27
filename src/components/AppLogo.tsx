import React from "react";

interface Props {
  size?: number;
  className?: string;
  rounded?: string;
}

/**
 * Logo resmi aplikasi DigiFuel (vektor dari public/icon.svg).
 * Dipakai di halaman login dan semua titik yang membutuhkan logo aplikasi.
 */
export const AppLogo: React.FC<Props> = ({
  size = 48,
  className = "",
  rounded = "rounded-2xl",
}) => {
  return (
    <img
      src="/icon.svg"
      alt="Logo DigiFuel"
      width={size}
      height={size}
      className={`${rounded} shadow-md ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
};
