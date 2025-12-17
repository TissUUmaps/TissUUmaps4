/** Similarity transform */
export type SimilarityTransform = {
  /** Scale factor */
  scale: number;

  /** Rotation around origin, in degrees */
  rotation: number;

  /** Translation, applied after scaling and rotation */
  translation: { x: number; y: number };
};
