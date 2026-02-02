import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HexColorPicker } from "react-colorful";

import { type Color, ColorUtils } from "@tissuumaps/core";

export type SimpleColorPickerProps = {
  color: Color;
  onColorChange: (color: Color) => void;
  children?: React.ReactNode;
  className?: string;
};

export function SimpleColorPicker({
  color,
  onColorChange,
  children,
  className,
}: SimpleColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger className={className} render={<Button />}>
        {children}
      </PopoverTrigger>
      <PopoverContent>
        <HexColorPicker
          color={ColorUtils.toHex(color)}
          onChange={(hex) => onColorChange(ColorUtils.fromHex(hex))}
        />
      </PopoverContent>
    </Popover>
  );
}
