import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Square } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { RgbaColorPicker } from "react-colorful";

import { type Color } from "@tissuumaps/core";

export function ColorPicker({
  color,
  opacity,
  onColorChange,
  onOpacityChange,
  className,
}: {
  color: Color;
  opacity: number;
  onColorChange: (newColor: Color) => void;
  onOpacityChange: (newOpacity: number) => void;
  className?: string;
}) {
  const rId = useId();
  const gId = useId();
  const bId = useId();
  const aId = useId();

  const [r, setR] = useState<number>(color.r);
  const [g, setG] = useState<number>(color.g);
  const [b, setB] = useState<number>(color.b);
  const [a, setA] = useState<number>(opacity);

  useEffect(() => {
    if (color.r !== r || color.g !== g || color.b !== b) {
      onColorChange({ r, g, b });
    }
    if (opacity !== a) {
      onOpacityChange(a);
    }
  }, [r, g, b, a, color, opacity, onColorChange, onOpacityChange]);

  return (
    <Popover>
      <PopoverTrigger render={<Button className={className} />}>
        Pick color <Square fill={`rgb(${r}, ${g}, ${b})`} opacity={a} />
      </PopoverTrigger>
      <PopoverContent>
        <RgbaColorPicker
          color={{ r, g, b, a }}
          onChange={({ r, g, b, a }) => {
            setR(r);
            setG(g);
            setB(b);
            setA(a);
          }}
        />
        <FieldGroup className="grid grid-cols-4 w-full">
          <Field>
            <FieldLabel htmlFor={rId}>R</FieldLabel>
            <Input
              id={rId}
              type="number"
              value={r}
              min={0}
              max={255}
              onChange={(event) => setR(Number(event.target.value))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={gId}>G</FieldLabel>
            <Input
              id={gId}
              type="number"
              value={g}
              min={0}
              max={255}
              onChange={(event) => setG(Number(event.target.value))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={bId}>B</FieldLabel>
            <Input
              id={bId}
              type="number"
              value={b}
              min={0}
              max={255}
              onChange={(event) => setB(Number(event.target.value))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={aId}>A</FieldLabel>
            <Input
              id={aId}
              type="number"
              value={a}
              min={0}
              max={1}
              step={0.01}
              onChange={(event) => setA(Number(event.target.value))}
            />
          </Field>
        </FieldGroup>
      </PopoverContent>
    </Popover>
  );
}
