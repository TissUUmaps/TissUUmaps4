import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useEffect, useState } from "react";

import type { HighlightedItemGroup } from "@tissuumaps/core";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app";

export type GroupVisibilityCellProps = {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;

  /** The group to show alone in the viewer while the button is hovered */
  highlightedItemGroup?: HighlightedItemGroup;
};

export function GroupVisibilityCell({
  visible,
  onVisibleChange,
  highlightedItemGroup,
}: GroupVisibilityCellProps) {
  const setHighlightedItemGroup = useAppStore(
    (state) => state.setHighlightedItemGroup,
  );

  const [hovered, setHovered] = useState(false);

  const { tableId, column, group } = highlightedItemGroup ?? {};

  // a row that is scrolled out or filtered away unmounts without a mouse leave
  useEffect(() => {
    if (
      !hovered ||
      tableId === undefined ||
      column === undefined ||
      group === undefined
    ) {
      return;
    }
    setHighlightedItemGroup({ tableId, column, group });
    return () => {
      setHighlightedItemGroup(null);
    };
  }, [hovered, tableId, column, group, setHighlightedItemGroup]);

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      title="Toggle group visibility"
      aria-label={visible ? "Hide group" : "Show group"}
      onClick={() => {
        setHovered(false);
        onVisibleChange(!visible);
      }}
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
    >
      {visible ? <EyeIcon /> : <EyeOffIcon />}
    </Button>
  );
}
