// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ReaderBase {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PixelsReaderBase extends ReaderBase {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TableReaderBase extends ReaderBase {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageReaderBase extends PixelsReaderBase {}

export interface LabelsReaderBase extends PixelsReaderBase, TableReaderBase {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PointsReaderBase extends TableReaderBase {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ShapesReaderBase extends TableReaderBase {}
