// import OpenSeadragon from "openseadragon";
// import Layer from "../model/layer";

// export default class OpenSeadragonUtils {
//   static createViewer(viewerElement: HTMLDivElement): OpenSeadragon.Viewer {
//     return new OpenSeadragon.Viewer({
//       element: viewerElement,
//       // TODO OpenSeadragon options
//     });
//   }

//   static updateLayers(
//     viewer: OpenSeadragon.Viewer,
//     oldLayers: Layer[],
//     newLayers: Layer[],
//   ): void {
//     // remove old layers
//     const layersToRemove = oldLayers.filter(
//       (layer) => !newLayers.includes(layer),
//     );
//     for (const layer of layersToRemove) {
//       const index = oldLayers.indexOf(layer);
//       OpenSeadragonUtils.removeLayer(viewer, index);
//     }
//     // sort and update existing layers
//     const oldLayerOrder = oldLayers.filter((layer) =>
//       newLayers.includes(layer),
//     );
//     const newLayerOrder = newLayers.filter((layer) =>
//       oldLayers.includes(layer),
//     );
//     for (const [newIndex, layer] of newLayerOrder.entries()) {
//       const oldIndex = oldLayerOrder.indexOf(layer);
//       if (oldIndex !== newIndex) {
//         OpenSeadragonUtils.moveLayer(viewer, oldIndex, newIndex);
//       }
//       OpenSeadragonUtils.updateLayer(viewer, newIndex, layer);
//     }
//     // insert new layers
//     const layersToAdd = newLayers.filter((layer) => !oldLayers.includes(layer));
//     for (const layer of layersToAdd) {
//       const index = newLayers.indexOf(layer);
//       OpenSeadragonUtils.addLayer(viewer, layer, index);
//     }
//   }

//   static updateLayer(
//     viewer: OpenSeadragon.Viewer,
//     index: number,
//     layer: Layer,
//   ): void {
//     const tiledImage = viewer.world.getItemAt(index);
//     // TODO tileSource
//     // TODO x, y
//     if (layer.rotation !== tiledImage.getRotation()) {
//       tiledImage.setRotation(layer.rotation);
//     }
//     if (layer.flip !== tiledImage.getFlip()) {
//       tiledImage.setFlip(layer.flip);
//     }
//     // TODO scale
//     if (layer.visible && layer.opacity !== tiledImage.getOpacity()) {
//       tiledImage.setOpacity(layer.opacity);
//     } else if (!layer.visible && tiledImage.getOpacity() !== 0) {
//       tiledImage.setOpacity(0);
//     }
//   }

//   private static addLayer(
//     viewer: OpenSeadragon.Viewer,
//     layer: Layer,
//     index?: number,
//   ): void {
//     viewer.addTiledImage({
//       tileSource: layer.tileSource,
//       index: index,
//       // TODO addTiledImage options
//     });
//   }

//   private static moveLayer(
//     viewer: OpenSeadragon.Viewer,
//     oldIndex: number,
//     newIndex: number,
//   ): void {
//     const tiledImage = viewer.world.getItemAt(oldIndex);
//     viewer.world.setItemIndex(tiledImage, newIndex);
//   }

//   private static removeLayer(
//     viewer: OpenSeadragon.Viewer,
//     index: number,
//   ): void {
//     const tiledImage = viewer.world.getItemAt(index);
//     viewer.world.removeItem(tiledImage);
//   }
// }
