"use client"

import { useEffect, useRef } from "react"
import { useGoogleMap } from "@react-google-maps/api"

function createPinContent({ color, kind }) {
  return new google.maps.marker.PinElement({
    background: color,
    borderColor: "#ffffff",
    glyphColor: "#ffffff",
    scale: kind === "pin" ? 1.1 : 0.95,
  })
}

export function AdvancedMapMarker({
  position,
  title,
  color = "#3b82f6",
  kind = "dot",
  zIndex,
  onClick,
}) {
  const map = useGoogleMap()
  const markerRef = useRef(null)
  const clickHandlerRef = useRef(onClick)

  useEffect(() => {
    clickHandlerRef.current = onClick
  }, [onClick])

  useEffect(() => {
    if (!map || !position || typeof google === "undefined" || !google.maps?.marker?.AdvancedMarkerElement) {
      return
    }

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      title,
      content: createPinContent({ color, kind }),
      zIndex,
      gmpClickable: Boolean(onClick),
    })

    if (onClick) {
      google.maps.event.addListener(marker, "click", () => {
        clickHandlerRef.current?.()
      })
    }

    markerRef.current = marker

    return () => {
      if (markerRef.current) {
        markerRef.current.map = null
        google.maps.event.clearInstanceListeners(markerRef.current)
        markerRef.current = null
      }
    }
  }, [color, kind, map, position?.lat, position?.lng, title, zIndex, onClick])

  return null
}