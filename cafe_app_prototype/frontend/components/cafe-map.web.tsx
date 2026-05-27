import { useEffect, useRef, useState } from 'react'
import { useLocation } from '@/context/location'

const QUERY = `[out:json];node["amenity"="cafe"](33.60,-117.95,33.75,-117.67);out;`
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

async function fetchCafes() {
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(`${mirror}?data=${encodeURIComponent(QUERY)}`)
      if (!res.ok) continue
      const data = await res.json()
      if (data.elements?.length) return data.elements
    } catch {}
  }
  return []
}

const cityCache = new Map<string, string>()

async function resolveCity(tags: any, lat: number, lon: number): Promise<string> {
  if (tags?.['addr:city']) {
    const state = tags['addr:state'] || 'CA'
    return `${tags['addr:city']}, ${state}`
  }
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
  if (cityCache.has(key)) return cityCache.get(key)!
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`,
      { headers: { 'User-Agent': 'CafeFinderApp/1.0' } }
    )
    const d = await res.json()
    const a = d.address || {}
    const city = a.city || a.town || a.village || a.suburb || ''
    const state = a.ISO3166_2_lvl4?.replace('US-', '') || a.state_code || 'CA'
    const result = city ? `${city}, ${state}` : state
    cityCache.set(key, result)
    return result
  } catch {
    return 'CA'
  }
}

export type SelectedCafe = { id: string; name: string; rating: number; street?: string; city: string; hours?: string; cuisine?: string }

type Props = { onSelectCafe?: (cafe: SelectedCafe | null) => void }

export default function CafeMap({ onSelectCafe }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const onSelectRef = useRef(onSelectCafe)
  const initialized = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const { showLocation } = useLocation()

  useEffect(() => { onSelectRef.current = onSelectCafe }, [onSelectCafe])

  useEffect(() => {
    if (initialized.current || !mapRef.current) return
    initialized.current = true

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    import('leaflet').then(async L => {
      if (!mapRef.current) return

      delete (L.Icon.Default.prototype as any)._getIconUrl

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

      map.on('click', () => onSelectRef.current?.(null))

      const cafes = await fetchCafes()
      cafes.forEach((cafe: any) => {
        const name = cafe.tags?.name || 'Café'
        const hours = cafe.tags?.opening_hours as string | undefined
        const cuisine = cafe.tags?.cuisine as string | undefined
        const houseNum = cafe.tags?.['addr:housenumber']
        const streetName = cafe.tags?.['addr:street']
        const street = houseNum && streetName ? `${houseNum} ${streetName}` : streetName
        const rating = parseFloat((3.8 + (Number(cafe.id) % 13) * 0.1).toFixed(1))

        L.marker([cafe.lat, cafe.lon], { icon: redMarker })
          .addTo(map)
          .on('click', async (e: any) => {
            L.DomEvent.stopPropagation(e)
            const city = await resolveCity(cafe.tags, cafe.lat, cafe.lon)
            onSelectRef.current?.({ id: String(cafe.id), name, rating, street, city, hours, cuisine })
          })
      })

      leafletMapRef.current = map
      setMapReady(true)
    })
  }, [])

  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return

    import('leaflet').then(L => {
      if (showLocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            if (userMarkerRef.current) userMarkerRef.current.remove()
            const userIcon = L.divIcon({
              className: '',
              html: `<div style="width:16px;height:16px;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })
            userMarkerRef.current = L.marker(
              [pos.coords.latitude, pos.coords.longitude],
              { icon: userIcon }
            ).addTo(leafletMapRef.current).bindPopup('You are here')
            leafletMapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 15)
          },
          () => {}
        )
      } else {
        if (userMarkerRef.current) {
          userMarkerRef.current.remove()
          userMarkerRef.current = null
        }
      }
    })
  }, [showLocation, mapReady])

  return <div ref={mapRef} style={{ width: '100%', height: '100vh' }} />
}
