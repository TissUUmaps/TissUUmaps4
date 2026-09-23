import { HexColorPicker, RgbaColorPicker } from "react-colorful";

import { type Color, ColorUtils } from "@tissuumaps/core";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type SimpleColorPickerProps = {
  color: Color;
  onColorChange: (color: Color, opacity: number) => void;
  opacity?: number;
  children?: React.ReactNode;
  className?: string;
};

export function SimpleColorPicker({
  color,
  onColorChange,
  opacity,
  children,
  className,
}: SimpleColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger className={className} render={<Button />}>
        {children}
      </PopoverTrigger>
      <PopoverContent>
        {opacity !== undefined ? (
          <RgbaColorPicker
            color={{ ...color, a: opacity }}
            onChange={({ r, g, b, a }) => onColorChange({ r, g, b }, a)}
          />
        ) : (
          <HexColorPicker
            color={ColorUtils.toHex(color)}
            onChange={(hex) => onColorChange(ColorUtils.fromHex(hex), 1)}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
