/**
 * Module-level registry for MapTiler map instances. Allows components outside
 * of the map itself (e.g. PosterCanvas's draggable pin, export renderers) to
 * project/unproject coordinates against the currently mounted map.
 *
 * Keys:
 *   - `primary` / `secondary` — the single-map editor (with split-map mode)
 *   - `wedding-0|1|2`         — the three slots of the multi-map wedding editor
 */
import type * as maptilersdk from '@maptiler/sdk'

export type Slice = 'primary' | 'secondary' | 'wedding-0' | 'wedding-1' | 'wedding-2'

const instances = new Map<Slice, maptilersdk.Map>()

export function setMapInstance(slice: Slice, map: maptilersdk.Map | null) {
  if (map) instances.set(slice, map)
  else instances.delete(slice)
}

export function getMapInstance(slice: Slice): maptilersdk.Map | undefined {
  return instances.get(slice)
}

export function weddingSliceFor(index: 0 | 1 | 2): Slice {
  return `wedding-${index}` as Slice
}
