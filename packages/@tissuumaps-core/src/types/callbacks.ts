/**
 * A callback function that receives progress updates
 *
 * @param progress - The current progress value in the range [0, total]
 * @param total - The total amount of work to be done
 */
export type ProgressCallback = (progress: number, total: number) => void;
