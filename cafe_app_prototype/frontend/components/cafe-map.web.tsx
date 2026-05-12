import { useEffect, useRef } from 'react'

const IRVINE_BOUNDS = '33.60,-117.95,33.75,-117.67'
const OVERPASS_URL = `https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="cafe"](${IRVINE_BOUNDS});out;`

export default function CafeMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || !mapRef.current) return
    initialized.current = true

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    import('leaflet').then(L => {
      if (!mapRef.current) return

      // Fix default marker icons broken by bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current, {
        wheelPxPerZoomLevel: 40,
        zoomSnap: 0,
        zoomDelta: 0.1,
      }).setView([33.6846, -117.8265], 13)

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      const redMarker = L.divIcon({
        className: '',
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="42">
          <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#e74c3c" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.35))"/>
          <circle cx="12" cy="12" r="5.5" fill="white"/>
        </svg>`,
        iconSize: [28, 42],
        iconAnchor: [14, 42],
        popupAnchor: [0, -44],
      })

      fetch(OVERPASS_URL)
        .then(res => res.json())
        .then(data => {
          data.elements.forEach((cafe: any) => {
            const name = cafe.tags?.name || 'Cafe'
            L.marker([cafe.lat, cafe.lon], { icon: redMarker })
              .addTo(map)
              .bindPopup(`<strong>${name}</strong>`)
          })
        })
    })
  }, [])

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '100vh' }}
    />
  )
}
