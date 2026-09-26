import { useMemo } from "react";

import { type GroupValueMap, getReferencedMapIds } from "@tissuumaps/core";

import { SimpleSelect } from "@/components/common/simple-select";
import { useConfirmDialog } from "@/components/dialogs/ConfirmDialog/hooks";
import { useProjectStore } from "@/stores/project";

export type GroupValueMapSelectProps<TValue> = {
  maps: GroupValueMap<TValue>[];
  value: string | null;
  onValueChange: (mapId: string | null) => void;
  onMapDelete: (mapId: string) => void;
};

export function GroupValueMapSelect<TValue>({
  maps,
  value,
  onValueChange,
  onMapDelete,
}: GroupValueMapSelectProps<TValue>) {
  const labels = useProjectStore((state) => state.labels);
  const points = useProjectStore((state) => state.points);
  const shapes = useProjectStore((state) => state.shapes);
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
            onMapDelete(map.id);
          }
        });
      }}
    />
  );
}
