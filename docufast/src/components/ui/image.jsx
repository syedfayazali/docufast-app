import React from "react";

/** Plain image. fittingType: "fill" = cover the box, "fit" = show the whole picture. */
export function Image({ src, alt = "", fittingType = "fit", className, style, ...rest }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      style={{ objectFit: fittingType === "fill" ? "cover" : "contain", ...style }}
      {...rest}
    />
  );
}

export default Image;
