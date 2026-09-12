import type { Color, ColorPalette } from "@tissuumaps/core";

import { SimpleSelect } from "@/components/common/simple-select";

const colorPaletteSwatchColorCount = 32;

export type ColorPaletteSelectProps = {
  colorPalettes: ColorPalette[];
  value: string | null;
  onValueChange: (newValue: string | null) => void;
};

export function ColorPaletteSelect({
  colorPalettes,
  value,
  onValueChange,
}: ColorPaletteSelectProps) {
  return (
    <SimpleSelect
      items={colorPalettes}
      itemLabel={colorPaletteLabel}
      itemValue={colorPaletteId}
      value={value}
      onValueChange={onValueChange}
      nullable
    />
  );
}

function colorPaletteLabel(colorPalette: ColorPalette) {
  return (
    <>
      <ColorPaletteSwatch colors={colorPalette.colors} />
      {colorPalette.name}
    </>
  );
}

function colorPaletteId(colorPalette: ColorPalette) {
  return colorPalette.id;
}

type ColorPaletteSwatchProps = {
  colors: Color[];
};

function ColorPaletteSwatch({ colors }: ColorPaletteSwatchProps) {
  const step = Math.ceil(colors.length / colorPaletteSwatchColorCount);
  const swatchColors = colors.filter(
    (_, i) => i % step === 0 || i === colors.length - 1,
  );
  const stops = swatchColors.map(
    ({ r, g, b }, i) =>
      `rgb(${r}, ${g}, ${b}) ${(100 * i) / swatchColors.length}% ${(100 * (i + 1)) / swatchColors.length}%`,
  );
  return (
    <span
      className="h-3 w-8 shrink-0 rounded-xs border border-input"
      style={{
        backgroundImage: `linear-gradient(to right, ${stops.join(", ")})`,
      }}
    />
  );
}
