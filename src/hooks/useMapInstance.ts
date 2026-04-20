/**
 * Module-level registry for MapTiler map instances. Allows components outside
 * of the map itself (e.g. PosterCanvas's draggable pin) to project/unproject
 * coordinates against the currently mounted map.
 */
import type * as maptilersdk from '@maptiler/sdk'

type Slice = 'primary' | 'secondary'

const instances = new Map<Slice, maptilersdk.Map>()

export function setMapInstance(slice: Slice, map: maptilersdk.Map | null) {
  if (map) instances.set(slice, map)
  else instances.delete(slice)
}

export function getMapInstance(slice: Slice): maptilersdk.Map | undefined {
  return instances.get(slice)
}
