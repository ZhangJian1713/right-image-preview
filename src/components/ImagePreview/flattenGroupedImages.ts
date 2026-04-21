import type { ImageGroup, ImageItem, ImagePreviewProps } from './types';

/** Internal flat index range after {@link flattenGroupedImages}. Not a public input shape. */
export interface FlattenedGroupSlice {
  name: string;
  start: number;
  end: number;
  /** Optional stable id for the group (e.g. folder path). */
  id?: string;
}

function isDevEnv(): boolean {
  const p = (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } }).process;
  return typeof p !== 'undefined' && p.env?.NODE_ENV !== 'production';
}

/**
 * Flattens {@link ImageGroup}[] into a single list plus index slices for in-group navigation.
 * Empty `images` arrays inside a group are skipped.
 */
export function flattenGroupedImages(grouped: ImageGroup[]): {
  images: ImageItem[];
  groupSlices: FlattenedGroupSlice[];
} {
  const images: ImageItem[] = [];
  const groupSlices: FlattenedGroupSlice[] = [];
  let idx = 0;
  for (const g of grouped) {
    const list = g.images ?? [];
    if (list.length === 0) continue;
    const start = idx;
    for (const item of list) {
      images.push(item);
      idx++;
    }
    groupSlices.push({ name: g.name, start, end: idx - 1, id: g.id });
  }
  return { images, groupSlices };
}

/** Resolves props to a flat image list and optional group slices. Priority: `groupedImages` → `images` → `src`. */
export function resolvePreviewImages(props: ImagePreviewProps): {
  images: ImageItem[];
  groupSlices: FlattenedGroupSlice[] | undefined;
} {
  const hasGrouped = Array.isArray(props.groupedImages) && props.groupedImages.length > 0;
  if (hasGrouped) {
    if (isDevEnv() && props.images && props.images.length > 0) {
      console.warn(
        '[right-image-preview] Both `groupedImages` and `images` are set; using `groupedImages` and ignoring `images`.',
      );
    }
    const { images, groupSlices } = flattenGroupedImages(props.groupedImages!);
    return { images, groupSlices: groupSlices.length > 0 ? groupSlices : undefined };
  }
  if (props.images && props.images.length > 0) {
    return { images: props.images, groupSlices: undefined };
  }
  if (props.src) {
    return {
      images: [
        {
          src: props.src,
          alt: props.alt,
          minimapSrc: props.minimapSrc,
          minimap: props.minimap,
        },
      ],
      groupSlices: undefined,
    };
  }
  return { images: [], groupSlices: undefined };
}
