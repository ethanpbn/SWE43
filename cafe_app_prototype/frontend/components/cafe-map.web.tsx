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

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

type CafeData = {
  id: string
  name: string
  rating: number
  lat: number
  lon: number
  tags: any
  street?: string
}

export type SelectedCafe = { id: string; name: string; rating: number; street?: string; city: string; hours?: string; cuisine?: string; distanceKm?: number }

type Props = {
  onSelectCafe?: (cafe: SelectedCafe | null) => void
  nearbyUsers?: { lat: number; lng: number }[]
  minRating?: number
  maxDistanceKm?: number
  sortBy?: 'rating' | 'distance'
  hideZoomControl?: boolean
  searchQuery?: string
  favoriteIds?: Set<string>
}

export default function CafeMap({
  onSelectCafe,
  nearbyUsers,
  minRating = 0,
  maxDistanceKm = 0,
  sortBy = 'rating',
  hideZoomControl = false,
  searchQuery = '',
  favoriteIds = new Set(),
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const lRef = useRef<any>(null)
  const redMarkerRef = useRef<any>(null)
  const greenMarkerRef = useRef<any>(null)
  const favoriteIdsRef = useRef(favoriteIds)
  const userMarkerRef = useRef<any>(null)
  const nearbyMarkersRef = useRef<any[]>([])
  const cafeMarkersRef = useRef<any[]>([])
  const allCafesRef = useRef<CafeData[]>([])
  const userPosRef = useRef<{ lat: number; lon: number } | null>(null)
  const onSelectRef = useRef(onSelectCafe)
  const zoomControlRef = useRef<any>(null)
  const initialized = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const { showLocation } = useLocation()

  useEffect(() => { onSelectRef.current = onSelectCafe }, [onSelectCafe])
  useEffect(() => { favoriteIdsRef.current = favoriteIds }, [favoriteIds])

  // Kept in a ref so async geolocation callbacks always invoke the latest version,
  // which closes over the current minRating / maxDistanceKm / sortBy props.
  const renderMarkersRef = useRef<() => void>(() => {})

  function renderMarkers() {
    if (!leafletMapRef.current || !lRef.current || !redMarkerRef.current) return

    cafeMarkersRef.current.forEach(m => m.remove())
    cafeMarkersRef.current = []

    const userPos = userPosRef.current

    let cafes = allCafesRef.current.map(cafe => ({
      ...cafe,
      distance: userPos
        ? haversineKm(userPos.lat, userPos.lon, cafe.lat, cafe.lon)
        : Infinity,
    }))

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      cafes = cafes.filter(c => c.name.toLowerCase().includes(q))
    }

    if (minRating > 0) {
      cafes = cafes.filter(c => c.rating >= minRating)
    }

    if (maxDistanceKm > 0 && userPos) {
      cafes = cafes.filter(c => c.distance <= maxDistanceKm)
    }

    if (sortBy === 'distance' && userPos) {
      cafes.sort((a, b) => a.distance - b.distance)
    } else {
      cafes.sort((a, b) => b.rating - a.rating)
    }

    cafes.forEach(cafe => {
      const isFav = favoriteIdsRef.current.has(cafe.id)
      const icon = isFav ? greenMarkerRef.current : redMarkerRef.current
      const marker = lRef.current.marker([cafe.lat, cafe.lon], { icon })
        .addTo(leafletMapRef.current)
        .on('click', async (e: any) => {
          lRef.current.DomEvent.stopPropagation(e)
          const city = await resolveCity(cafe.tags, cafe.lat, cafe.lon)
          const hours = cafe.tags?.opening_hours as string | undefined
          const cuisine = cafe.tags?.cuisine as string | undefined
          const distanceKm = userPosRef.current
            ? haversineKm(userPosRef.current.lat, userPosRef.current.lon, cafe.lat, cafe.lon)
            : undefined
          onSelectRef.current?.({ id: cafe.id, name: cafe.name, rating: cafe.rating, street: cafe.street, city, hours, cuisine, distanceKm })
        })
      cafeMarkersRef.current.push(marker)
    })
  }

  // Sync the ref every render so it always points at the latest closure
  renderMarkersRef.current = renderMarkers

  // Re-render markers whenever filter, sort, or favorites change
  useEffect(() => {
    if (!mapReady) return
    renderMarkersRef.current()
  }, [minRating, maxDistanceKm, sortBy, searchQuery, favoriteIds, mapReady])

  // Show/hide the Leaflet zoom control when the filter panel opens/closes
  useEffect(() => {
    if (!mapReady || !zoomControlRef.current || !leafletMapRef.current) return
    if (hideZoomControl) {
      zoomControlRef.current.remove()
    } else {
      zoomControlRef.current.addTo(leafletMapRef.current)
    }
  }, [hideZoomControl, mapReady])

  // Map initialisation — fetch cafes and store them; renderMarkers is triggered by mapReady above
  useEffect(() => {
    if (initialized.current || !mapRef.current) return
    initialized.current = true
    let aborted = false

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    import('leaflet').then(async L => {
      if (aborted || !mapRef.current) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      lRef.current = L

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
      redMarkerRef.current = redMarker

      const greenMarker = L.divIcon({
        className: '',
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="42">
          <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#27ae60" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.35))"/>
          <circle cx="12" cy="12" r="5.5" fill="white"/>
        </svg>`,
        iconSize: [28, 42],
        iconAnchor: [14, 42],
        popupAnchor: [0, -44],
      })
      greenMarkerRef.current = greenMarker

      zoomControlRef.current = map.zoomControl
      map.on('click', () => onSelectRef.current?.(null))

      const rawCafes = await fetchCafes()
      allCafesRef.current = rawCafes.map((cafe: any) => {
        const name = cafe.tags?.name || 'Café'
        const houseNum = cafe.tags?.['addr:housenumber']
        const streetName = cafe.tags?.['addr:street']
        const street = houseNum && streetName ? `${houseNum} ${streetName}` : streetName
        const seed = [...String(cafe.id)].reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7)
        const rating = parseFloat((3.5 + (seed % 16) * 0.1).toFixed(1))
        return { id: String(cafe.id), name, rating, lat: cafe.lat, lon: cafe.lon, tags: cafe.tags, street }
      })

      leafletMapRef.current = map
      setMapReady(true)
    })

    return () => {
      aborted = true
      initialized.current = false
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
      setMapReady(false)
    }
  }, [])

  // User location (blue dot) — also stores position so distance filter/sort works
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return
    import('leaflet').then(L => {
      if (showLocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            userPosRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude }

            if (userMarkerRef.current) userMarkerRef.current.remove()
            const icon = L.divIcon({
              className: '',
              html: `<div style="width:16px;height:16px;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })
            userMarkerRef.current = L.marker([pos.coords.latitude, pos.coords.longitude], { icon })
              .addTo(leafletMapRef.current)
              .bindPopup('You are here')
            leafletMapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 15)

            // Re-render cafe markers now that we have a position (distance filter/sort can apply)
            renderMarkersRef.current()
          },
          () => {}
        )
      } else {
        userPosRef.current = null
        if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null }
        renderMarkersRef.current()
      }
    })
  }, [showLocation, mapReady])

  // Nearby user markers
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return
    import('leaflet').then(L => {
      nearbyMarkersRef.current.forEach(m => m.remove())
      nearbyMarkersRef.current = []
      if (!nearbyUsers?.length) return
      const icon = L.divIcon({
        className: '',
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 36 36" style="filter:drop-shadow(0 3px 5px rgba(0,0,0,0.45)) drop-shadow(0 1px 2px rgba(0,0,0,0.3))">
          <circle cx="18" cy="18" r="18" fill="#4285F4"/>
          <circle cx="18" cy="13" r="5.5" fill="white"/>
          <path d="M6 30c0-6.6 5.4-12 12-12s12 5.4 12 12" fill="white"/>
        </svg>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
      nearbyUsers.forEach(u => {
        const m = L.marker([u.lat, u.lng], { icon })
          .addTo(leafletMapRef.current)
          .bindPopup('Nearby user')
        nearbyMarkersRef.current.push(m)
      })
    })
  }, [nearbyUsers, mapReady])

  return <div ref={mapRef} style={{ width: '100%', height: '100vh' }} />
}
