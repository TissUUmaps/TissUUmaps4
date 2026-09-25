import { useMemo } from "react";

import {
  type GroupValueMap,
  type GroupValueMapKind,
  getReferencedMapIds,
} from "@tissuumaps/core";

import { SimpleSelect } from "@/components/common/simple-select";
import { useConfirmDialog } from "@/components/dialogs/ConfirmDialog/hooks";
import { useProjectStore } from "@/stores/project";

export type GroupValueMapSelectProps = {
  kind: GroupValueMapKind;
  value: string | null;
  onValueChange: (mapId: string | null) => void;
};

export function GroupValueMapSelect({
  kind,
  value,
  onValueChange,
}: GroupValueMapSelectProps) {
  const maps: GroupValueMap<unknown>[] = useProjectStore(
    (state) => state[`${kind}Maps`],
  );
  const labels = useProjectStore((state) => state.labels);
  const points = useProjectStore((state) => state.points);
  const shapes = useProjectStore((state) => state.shapes);
  const deleteMap = useProjectStore((state) => state.deleteMap);
  const confirm = useConfirmDialog();

  const referencedMapIds = useMemo(
    () => getReferencedMapIds({ labels, points, shapes }),
    [labels, points, shapes],
  );

  return (
    <SimpleSelect
      items={maps}
      itemLabel={(map) => map.name}
      itemValue={(map) => map.id}
      value={value}
      onValueChange={onValueChange}
      nullable
      isItemDeletable={(map) => !referencedMapIds.has(map.id)}
      onItemDelete={(map) => {
        void confirm({
          title: "Delete map",
          body: `Are you sure you want to delete the map "${map.name}"? This action cannot be undone.`,
        }).then((confirmed) => {
          if (confirmed) {
            if (map.id === value) {
              onValueChange(null);
            }
            deleteMap(kind, map.id);
          }
        });
      }}
    />
  );
}
