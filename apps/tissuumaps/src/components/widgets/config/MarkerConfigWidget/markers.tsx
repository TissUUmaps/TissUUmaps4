import {
  ArrowRightIcon,
  ChevronRightIcon,
  CircleIcon,
  DiamondIcon,
  MinusIcon,
  PlusIcon,
  Share2Icon,
  SquareIcon,
  StarIcon,
  TriangleIcon,
  XIcon,
} from "lucide-react";

import { Marker } from "@tissuumaps/core";

export const markers = [
  {
    value: Marker.Cross,
    icon: <PlusIcon className="fill-foreground size-4" />,
    label: "Plus",
  },
  {
    value: Marker.Diamond,
    icon: <DiamondIcon className="fill-foreground size-4" />,
    label: "Diamond",
  },
  {
    value: Marker.Square,
    icon: <SquareIcon className="fill-foreground size-4" />,
    label: "Square",
  },
  {
    value: Marker.TriangleUp,
    icon: <TriangleIcon className="fill-foreground size-4" />,
    label: "Triangle up",
  },
  {
    value: Marker.Star,
    icon: <StarIcon className="fill-foreground size-4" />,
    label: "Star",
  },
  {
    value: Marker.Clobber,
    icon: <Share2Icon className="fill-foreground size-4 rotate-90" />,
    label: "Tri-up",
  },
  {
    value: Marker.Disc,
    icon: <CircleIcon className="fill-foreground size-4" />,
    label: "Point",
  },
  {
    value: Marker.HBar,
    icon: <MinusIcon className="fill-foreground size-4" />,
    label: "Horizontal line",
  },
  {
    value: Marker.VBar,
    icon: <MinusIcon className="fill-foreground size-4 rotate-90" />,
    label: "Vertical line",
  },
  {
    value: Marker.TailedArrow,
    icon: <ArrowRightIcon className="fill-foreground size-4" />,
    label: "Arrow right",
  },
  {
    value: Marker.TriangleDown,
    icon: <TriangleIcon className="fill-foreground size-4 rotate-180" />,
    label: "Triangle down",
  },
  {
    value: Marker.Ring,
    icon: <CircleIcon className="fill-background size-4" />,
    label: "Circle",
  },
  {
    value: Marker.X,
    icon: <XIcon className="fill-foreground size-4" />,
    label: "X",
  },
  {
    value: Marker.Arrow,
    icon: <ChevronRightIcon className="fill-background size-4" />,
    label: "Chevron right",
  },
  {
    value: Marker.Gaussian,
    icon: <CircleIcon className="fill-foreground size-4" />,
    label: "Gaussian",
  },
];
