import { JsonForms } from "@jsonforms/react";
import { useMemo } from "react";

import { type Image, type ImageDataSource } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { cells, renderers } from "../../jsonforms";

export function ImagesPanelItemSettings({ image }: { image: Image }) {
  const updateImage = useTissUUmaps((state) => state.updateImage);
  const createImageDataLoader = useTissUUmaps(
    (state) => state.createImageDataLoader,
  );

  const imageDataLoader = useMemo(
    () => createImageDataLoader(image.id),
    [createImageDataLoader, image.id],
  );

  return (
    <div>
      {/* Data source */}
      <JsonForms
        schema={imageDataLoader.schema}
        uischema={imageDataLoader.uischema}
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
