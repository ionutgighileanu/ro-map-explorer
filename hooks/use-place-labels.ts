import { useEffect } from "react"
import type mapboxgl from "mapbox-gl"

export function usePlaceLabels(
  map: mapboxgl.Map | null,
  ready: boolean,
  placeLabels: boolean
) {
  useEffect(() => {
    if (!map || !ready) return

    const ALWAYS_VISIBLE = ["background", "water", "land", "satellite", "admin"]

    const shouldHide = (layer: { id: string; type: string }) => {
      if (ALWAYS_VISIBLE.some((kw) => layer.id.includes(kw))) return false
      return (
        layer.type === "symbol" ||
        layer.id.includes("road") ||
        layer.id.includes("tunnel") ||
        layer.id.includes("bridge")
      )
    }

    const apply = () => {
      const style = map.getStyle()
      if (!style?.layers) return
      const visibility = placeLabels ? "visible" : "none"
      for (const layer of style.layers) {
        if (shouldHide(layer)) {
          map.setLayoutProperty(layer.id, "visibility", visibility)
        }
      }
    }

    apply()
    map.on("style.load", apply)
    return () => {
      map.off("style.load", apply)
    }
  }, [map, ready, placeLabels])
}
