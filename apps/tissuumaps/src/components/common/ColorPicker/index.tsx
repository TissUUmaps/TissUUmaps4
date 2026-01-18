import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
        <FieldGroup className="grid grid-cols-3 w-full">
          <Field>
            <FieldLabel>R</FieldLabel>
            <Input
              type="number"
              value={r}
              min={0}
              max={255}
              onChange={(event) => setR(Number(event.target.value))}
            />
          </Field>
          <Field>
            <FieldLabel>G</FieldLabel>
            <Input
              type="number"
              value={g}
              min={0}
              max={255}
              onChange={(event) => setG(Number(event.target.value))}
            />
          </Field>
          <Field>
            <FieldLabel>B</FieldLabel>
            <Input
              type="number"
              value={b}
              min={0}
              max={255}
              onChange={(event) => setB(Number(event.target.value))}
            />
          </Field>
        </FieldGroup>
      </PopoverContent>
    </Popover>
  );
}
