import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Square } from "lucide-react";
import { useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";

import { type Color, ColorUtils } from "@tissuumaps/core";

import { Field, FieldControl, FieldLabel } from "./field";

export function ColorPicker({
  color,
  onColorChange,
  className,
}: {
  color: Color;
  onColorChange: (newColor: Color) => void;
  className?: string;
}) {
  const [r, setR] = useState<number>(color.r);
  const [g, setG] = useState<number>(color.g);
  const [b, setB] = useState<number>(color.b);

  useEffect(() => {
    if (color.r !== r || color.g !== g || color.b !== b) {
      onColorChange({ r, g, b });
    }
  }, [r, g, b, color, onColorChange]);

  return (
    <Popover>
      <PopoverTrigger render={<Button className={className} />}>
        Pick color <Square fill={`rgb(${r}, ${g}, ${b})`} />
      </PopoverTrigger>
      <PopoverContent>
        <HexColorPicker
          color={ColorUtils.toHex({ r, g, b })}
          onChange={(hex) => {
            const { r, g, b } = ColorUtils.fromHex(hex);
            setR(r);
            setG(g);
            setB(b);
          }}
        />
        <div className="grid grid-cols-3 w-full">
          <Field>
            <FieldLabel>R</FieldLabel>
            <FieldControl
              render={
                <Input
                  type="number"
                  value={r}
                  min={0}
                  max={255}
                  onChange={(event) => setR(Number(event.target.value))}
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
                  value={g}
                  min={0}
                  max={255}
                  onChange={(event) => setG(Number(event.target.value))}
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
                  value={b}
                  min={0}
                  max={255}
                  onChange={(event) => setB(Number(event.target.value))}
                />
              }
            />
          </Field>
        </div>
      </PopoverContent>
    </Popover>
  );
}
