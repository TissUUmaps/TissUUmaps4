import OpenSeadragon from "openseadragon";
import Layer from "../model/layer";

export default class OpenSeadragonUtils {
  static createViewer(viewerElement: HTMLDivElement): OpenSeadragon.Viewer {
    return new OpenSeadragon.Viewer({
      element: viewerElement,
      // TODO OpenSeadragon options
    });
  }

  static updateLayers(
    viewer: OpenSeadragon.Viewer,
    oldLayers: Layer[],
    newLayers: Layer[],
  ): void {
    // remove old layers
    const layersToRemove = oldLayers.filter(
      (layer) => !newLayers.includes(layer),
    );
    for (const layer of layersToRemove) {
      const index = oldLayers.indexOf(layer);
      const item = viewer.world.getItemAt(index);
      viewer.world.removeItem(item);
    }
    // sort existing layers
    const oldLayerOrder = oldLayers.filter((layer) =>
      newLayers.includes(layer),
    );
    const newLayerOrder = newLayers.filter((layer) =>
      oldLayers.includes(layer),
    );
    for (const [oldIndex, layer] of oldLayerOrder.entries()) {
      const newIndex = newLayerOrder.indexOf(layer);
      if (oldIndex !== newIndex) {
        const tiledImage = viewer.world.getItemAt(oldIndex);
        viewer.world.setItemIndex(tiledImage, newIndex);
      }
    }
    // insert new layers
    const layersToInsert = newLayers.filter(
      (layer) => !oldLayers.includes(layer),
    );
    for (const layer of layersToInsert) {
      const index = newLayers.indexOf(layer);
      viewer.addTiledImage({
        tileSource: layer.tileSource,
        index: index,
        // TODO addTiledImage options
      });
    }
  }
}
