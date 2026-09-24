import { serveHierarchicalTable } from "../worker/serveHierarchicalTable";
import { H5wasmStore } from "./H5wasmStore";

serveHierarchicalTable((source) => H5wasmStore.open(source));
