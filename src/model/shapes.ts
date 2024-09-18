/** Shape cloud settings */
import { ShapesProviderConfig } from "../utils/IOUtils";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ShapesSettings {}

/** A named collection of shapes (a.k.a. shape cloud) */
export default interface Shapes {
  /** Human-readable shape cloud name */
  name: string;

  /** Data provider configuration */
  data: { type: string; config: ShapesProviderConfig };

  /** Shape cloud settings */
  settings: ShapesSettings;
}

export const defaultShapesSettings: ShapesSettings = {};
