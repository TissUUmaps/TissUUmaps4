import {
  type ColumnDef,
  type RowData,
  columnSizingFeature,
  flexRender,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  type RefObject,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Maps a scroll range that is too tall for the browser onto one it can lay out
 *
 * Browsers cap the height of an element at a few ten million pixels, and
 * silently clamp anything taller, so a list of millions of rows cannot be
 * scrolled past the cap. The list is therefore laid out at a compressed
 * height, and every scroll position is scaled between the two: the content
 * position is `factor` times the layout position, so that the end of the
 * layout still shows the end of the content.
 *
 * @param contentSize - The size of the content, in pixels
 * @param viewportSize - The size of the scroll container, in pixels
 * @param maxContentSize - The largest size to lay out, in pixels
 * @returns The size to lay out, and the factor content positions exceed layout
 * positions by, which is `1` while the content fits
 */
function compressScrollRange(
  contentSize: number,
  viewportSize: number,
  maxContentSize: number,
): { layoutSize: number; factor: number } {
  const range = contentSize - viewportSize;
  const maxRange = maxContentSize - viewportSize;
  if (range <= maxRange || maxRange <= 0) {
    return { layoutSize: contentSize, factor: 1 };
  }
  return { layoutSize: maxContentSize, factor: range / maxRange };
}

/**
 * The tallest scroll content that is laid out, in pixels
 *
 * Browsers cap the height of an element at a few ten million pixels, Chrome
 * at about 33 million divided by the page zoom, and clamp anything taller, so
 * that a longer list could not be scrolled past the cap. Content beyond this
 * height is compressed instead, see {@link compressScrollRange}.
 */
const maxScrollContentHeight = 10_000_000;

/**
 * How many rows are rendered beyond each end of the visible range
 *
 * Rows outside of it are not rendered, so scrolling reveals blank space until
 * the next render; the overscan covers a scroll of up to this many rows.
 */
const overscan = 2;

/**
 * The layout of a compressed virtualized list
 */
type CompressedVirtualizer = {
  /** Attached to the scroll container */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Attached to the header that sticks to the top of the scroll container */
  headerRef: RefObject<HTMLTableSectionElement | null>;
  /** The first row within the visible range */
  firstIndex: number;
  /** The row past the last one within the visible range */
  lastIndex: number;
  /** The height to lay the rows out at, in pixels */
  rowsHeight: number;
  /** How far the rows have run ahead of the layout, in pixels */
  rowShift: number;
};

/**
 * Virtualizes a list of rows that is taller than the browser can lay out
 *
 * Rows have a fixed height, so that the visible range follows from the scroll
 * offset alone. Past the height a browser lays out, the rows are compressed
 * into the height it does, and every row is shifted by how far the list has
 * run ahead of the layout at the current scroll offset.
 *
 * @param rowCount - The number of rows in the list
 * @param rowHeight - The height of every row, in pixels
 * @param height - The height of the scroll container, in pixels
 * @returns The refs to attach, the visible range of rows and their layout
 */
function useCompressedVirtualizer(
  rowCount: number,
  rowHeight: number,
  height: number,
): CompressedVirtualizer {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(height);
  const compressionRef = useRef(1);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (header === null) {
      return;
    }
    const resizeObserver = new ResizeObserver(() =>
      setHeaderHeight(header.offsetHeight),
    );
    resizeObserver.observe(header);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const [scrollOffset, setScrollOffset] = useState(0);
  // the offset is also kept in a ref, so that restoring it after a resize does
  // not have to re-subscribe on every scroll
  const scrollOffsetRef = useRef(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const onScroll = () => {
      // the element scrolls in layout positions, the rows are laid out in
      // content positions, which differ once the content is compressed
      const offset = container.scrollTop * compressionRef.current;
      scrollOffsetRef.current = offset;
      setScrollOffset(offset);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
    };
  }, []);

  const { layoutSize: layoutContentHeight, factor: compression } =
    compressScrollRange(
      headerHeight + rowCount * rowHeight,
      viewportHeight,
      maxScrollContentHeight,
    );
  // laid out before the browser can raise a scroll event against a stale factor
  useLayoutEffect(() => {
    compressionRef.current = compression;
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    // the same content offset lies at a different layout offset under the new
    // factor, and no scroll event announces the change
    const layoutOffset = Math.round(scrollOffsetRef.current / compression);
    if (container.scrollTop !== layoutOffset) {
      container.scrollTop = layoutOffset;
    }
  }, [compression]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    // a hidden panel loses its scroll offset without raising a scroll event,
    // which would leave the rendered rows outside of the visible range
    const resizeObserver = new ResizeObserver(() => {
      if (container.clientHeight === 0) {
        return;
      }
      setViewportHeight(container.clientHeight);
      const layoutOffset = Math.round(
        scrollOffsetRef.current / compressionRef.current,
      );
      if (container.scrollTop !== layoutOffset) {
        container.scrollTop = layoutOffset;
      }
    });
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // the rows follow the header in the scroll content, so the offset into them
  // is the scroll offset less the header
  const rowsScrollOffset = Math.max(0, scrollOffset - headerHeight);

  return {
    containerRef,
    headerRef,
    firstIndex: Math.max(
      0,
      Math.floor(rowsScrollOffset / rowHeight) - overscan,
    ),
    lastIndex: Math.min(
      rowCount,
      Math.ceil((rowsScrollOffset + viewportHeight) / rowHeight) + overscan,
    ),
    rowsHeight: layoutContentHeight - headerHeight,
    rowShift: scrollOffset * (1 - 1 / compression),
  };
}

/**
 * The table features a virtual table uses
 *
 * A table only has the APIs of the features registered here. Column sizing
 * gives every cell the width of its column; nothing else is needed, as the
 * rows are windowed and the columns are neither sorted, filtered nor hidden.
 */
const features = tableFeatures({ columnSizingFeature });

export type VirtualTableColumnDef<TRowData extends RowData> = ColumnDef<
  typeof features,
  TRowData
>;

export type VirtualTableProps<TRowData extends RowData> = {
  rowCount: number;
  /** Returns the rows within `[startIndex, endIndex)` */
  getRows: (startIndex: number, endIndex: number) => TRowData[];
  getRowId: (row: TRowData) => string;
  columnDefs: VirtualTableColumnDef<TRowData>[];
  rowHeight: number;
  height: number;
  rowClassName?: (row: TRowData) => string | undefined;
  className?: string;
};

export function VirtualTable<TRowData extends RowData>({
  rowCount,
  getRows,
  getRowId,
  columnDefs,
  rowHeight,
  height,
  rowClassName,
  className,
}: VirtualTableProps<TRowData>) {
  const {
    containerRef,
    headerRef,
    firstIndex,
    lastIndex,
    rowsHeight,
    rowShift,
  } = useCompressedVirtualizer(rowCount, rowHeight, height);

  // only the rows within the visible range are materialized, so that the cost
  // of the table does not depend on the number of rows
  const rows = useMemo(
    () => getRows(firstIndex, lastIndex),
    [getRows, firstIndex, lastIndex],
  );

  const table = useTable<typeof features, TRowData>({
    features,
    data: rows,
    columns: columnDefs,
    getRowId,
  });

  const tableRows = table.getRowModel().rows;

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto relative", className)}
      style={{ height: `${height}px` }}
    >
      <Table className="grid w-max min-w-full">
        <TableHeader
          ref={headerRef}
          className="grid sticky top-0 z-10 bg-background"
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="flex w-full">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="flex h-auto p-0"
                  style={{ width: `${header.getSize()}px` }}
                  colSpan={header.colSpan}
                >
                  {!header.isPlaceholder &&
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody
          className="grid relative"
          style={{ height: `${rowsHeight}px` }}
        >
          {tableRows.map((row, index) => (
            <TableRow
              key={row.id}
              className={cn(
                "flex absolute w-full border-0 items-center overflow-hidden",
                rowClassName?.(row.original),
              )}
              style={{
                height: `${rowHeight}px`,
                transform: `translateY(${(firstIndex + index) * rowHeight - rowShift}px)`,
              }}
            >
              {row.getAllCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className="flex p-0 pt-1"
                  style={{ width: `${cell.column.getSize()}px` }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
