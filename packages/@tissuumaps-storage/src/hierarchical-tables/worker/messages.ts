import type { GenericArray } from "@tissuumaps/core";

import type { HierarchicalTableColumn } from "../HierarchicalTable";

export type HierarchicalTableOpenRequest = {
  op: "open";
  source: File | string;
};

export type HierarchicalTableOpenResponse = {
  columns: HierarchicalTableColumn[];
  numRows: number;
};

export type HierarchicalTableColumnRequest = {
  op: "column";
  column: string;
  numRows?: number;
};

export type HierarchicalTableColumnResponse = {
  data: GenericArray<unknown>;
};

export type HierarchicalTableRangeRequest = {
  op: "range";
  column: string;
  numRows?: number;
};

export type HierarchicalTableRangeResponse = {
  range: [number, number] | undefined;
};

export type HierarchicalTableWorkerRequest =
  | HierarchicalTableOpenRequest
  | HierarchicalTableColumnRequest
  | HierarchicalTableRangeRequest;

export type HierarchicalTableWorkerResponse =
  | HierarchicalTableOpenResponse
  | HierarchicalTableColumnResponse
  | HierarchicalTableRangeResponse;

/** A request to the worker, answered by the message with the same id */
export type HierarchicalTableWorkerRequestMessage = {
  id: number;
} & HierarchicalTableWorkerRequest;

/** The response to a request, or the error it failed with */
export type HierarchicalTableWorkerResponseMessage = { id: number } & (
  HierarchicalTableWorkerResponse | { error: string }
);
