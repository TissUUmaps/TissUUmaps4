import { type ShapesGeometry } from "@tissuumaps/core";

/** The data source handed to the worker — a transferred buffer or a URL it fetches itself. */
export type GeoJSONSource =
  | { kind: "buffer"; buffer: ArrayBuffer }
  | { kind: "url"; url: string };

/** Request sent from the main thread to the worker. */
export type GeoJSONRequest = {
  source: GeoJSONSource;
  idProperty?: string;
  nameProperty?: string;
};

/** Parsed result returned by the worker (the geometry transfers zero-copy). */
export type GeoJSONResult = {
  geometry: ShapesGeometry;
  ids?: number[];
  names?: string[];
};

/** Response sent from the worker to the main thread. */
export type GeoJSONResponse =
  | { type: "result"; result: GeoJSONResult }
  | { type: "error"; message: string };
