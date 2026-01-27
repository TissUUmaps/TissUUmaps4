import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Square } from "lucide-react";
import { HexColorPicker } from "react-colorful";

import { type Color, ColorUtils } from "@tissuumaps/core";

import { Field, FieldControl, FieldLabel } from "./field";

export type ColorPickerProps = {
  color: Color;
  onColorChange: (color: Color) => void;
  className?: string;
};

export function ColorPicker({
  color,
  onColorChange,
  className,
}: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger render={<Button className={className} />}>
        Pick color <Square fill={`rgb(${color.r}, ${color.g}, ${color.b})`} />
      </PopoverTrigger>
      <PopoverContent>
        <HexColorPicker
          color={ColorUtils.toHex(color)}
          onChange={(hex) => onColorChange(ColorUtils.fromHex(hex))}
        />
        <div className="grid grid-cols-3 w-full">
          <Field>
            <FieldLabel>R</FieldLabel>
            <FieldControl
              render={
                <Input
                  type="number"
                  value={color.r}
                  min={0}
                  max={255}
                  onChange={(event) =>
                    onColorChange({ ...color, r: +event.target.value })
                  }
                />
              }
            />
          </Field>
          <Field>
            <FieldLabel>G</FieldLabel>
            <FieldControl
              render={
                <Input
                  type="number"
                  value={color.g}
                  min={0}
                  max={255}
                  onChange={(event) =>
                    onColorChange({ ...color, g: +event.target.value })
                  }
                />
              }
            />
          </Field>
          <Field>
            <FieldLabel>B</FieldLabel>
            <FieldControl
              render={
                <Input
                  type="number"
                  value={color.b}
                  min={0}
                  max={255}
                  onChange={(event) =>
                    onColorChange({ ...color, b: +event.target.value })
                  }
                />
              }
            />
          </Field>
        </div>
      </PopoverContent>
    </Popover>
  );
}
