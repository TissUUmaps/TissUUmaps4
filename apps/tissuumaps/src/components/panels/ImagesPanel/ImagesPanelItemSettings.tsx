import { JsonForms } from "@jsonforms/react";
import { useMemo } from "react";

import { type Image, type ImageDataSource } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { cells, renderers } from "../../jsonforms";

export type ImagesPanelItemSettingsProps = {
  image: Image;
};

export function ImagesPanelItemSettings({
  image,
}: ImagesPanelItemSettingsProps) {
  const imageDataStorageRegistry = useTissUUmaps(
    (state) => state.imageDataStorageRegistry,
  );
  const updateImage = useTissUUmaps((state) => state.updateImage);

  const { dataSourceSchema, dataSourceUISchema } = useMemo(() => {
    const value = imageDataStorageRegistry.get(image.dataSource.type);
    if (value === undefined) {
      throw new Error(
        `No image data storage adapter registered for data source type "${image.dataSource.type}"`,
      );
    }
    return value;
  }, [imageDataStorageRegistry, image.dataSource.type]);

  return (
    <div>
      {/* Data source */}
      <JsonForms
        schema={dataSourceSchema}
        uischema={dataSourceUISchema}
        data={image.dataSource}
        onChange={({ data, errors }) => {
          if (errors === undefined || errors.length === 0) {
            updateImage(image.id, {
              dataSource: {
                ...image.dataSource,
                ...(data as ImageDataSource),
              },
            });
          }
        }}
        renderers={renderers}
        cells={cells}
      />
    </div>
  );
}
