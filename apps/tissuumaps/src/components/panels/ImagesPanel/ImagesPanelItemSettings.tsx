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
  const imageDataLoaderRegistry = useTissUUmaps(
    (state) => state.imageDataLoaderRegistry,
  );
  const updateImage = useTissUUmaps((state) => state.updateImage);

  const { dataSourceSchema, dataSourceUISchema } = useMemo(() => {
    const value = imageDataLoaderRegistry.get(image.dataSource.type);
    if (value === undefined) {
      throw new Error(
        `No image data loader registered for data source type "${image.dataSource.type}"`,
      );
    }
    return value;
  }, [imageDataLoaderRegistry, image.dataSource.type]);

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
