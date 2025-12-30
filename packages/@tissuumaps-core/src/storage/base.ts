// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DataLoader {}

export interface Data {
  destroy(): void;
}

export interface ItemsData extends Data {
  getLength(): number;
  getIndex(): Uint16Array | number[];
}
