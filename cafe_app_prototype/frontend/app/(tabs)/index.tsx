import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect, useRouter } from 'expo-router'
import { useAuth } from '@/context/auth'
import { ThemedView } from '@/components/themed-view'
import FriendsPanel from '@/components/friends-panel'
import { useColorScheme } from '@/hooks/use-color-scheme'

const LIGHT = {
  card:       '#fff8f2',
  cardBorder: '#f0e4d4',
  header:     '#fbf1e6',
  avatar:     '#e8d5c0',
  favCard:    '#fff8f2',
  favRating:  '#fbf1e6',
  title:      '#4b3723',
  name:       '#3d2b1a',
  sub:        '#9b7a5e',
  accent:     '#7d5236',
  star:       '#c8973a',
  signOutBg:  'transparent',
  signOutBdr: '#e8d5c0',
  signOutTxt: '#e74c3c',
  label:      '#9b7a5e',
  loading:    '#b09080',
}
const DARK = {
  card:       '#1e1208',
  cardBorder: '#2e1e0e',
  header:     '#1a0f06',
  avatar:     '#3a2410',
  favCard:    '#1e1208',
  favRating:  '#2e1e0e',
  title:      '#f0ddc8',
  name:       '#e8d0b8',
  sub:        '#7d6050',
  accent:     '#c8973a',
  star:       '#c8973a',
  signOutBg:  'transparent',
  signOutBdr: '#3a2410',
  signOutTxt: '#e07060',
  label:      '#6a5040',
  loading:    '#6a5040',
}

const QUERY = `[out:json];node["amenity"="cafe"](33.60,-117.95,33.75,-117.67);out;`
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

async function fetchOsmCafes() {
  for (const m of MIRRORS) {
    try {
      const r = await fetch(`${m}?data=${encodeURIComponent(QUERY)}`)
      if (!r.ok) continue
      const d = await r.json()
      if (d.elements?.length) return d.elements
    } catch {}
  }
  return []
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function ratingFor(id: string) {
  const seed = [...id].reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7)
  return parseFloat((3.5 + (seed % 16) * 0.1).toFixed(1))
}

function getUserLocation(): Promise<{ lat: number; lon: number } | null> {
  return new Promise(resolve => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      )
    } else {
      resolve(null)
    }
  })
}

type OsmCafe = { id: string; name: string; lat: number; lon: number; rating: number; distanceKm?: number }
type FavCafe = { id: string; name: string; rating: number; city: string; street?: string }

type Colors = typeof LIGHT

function FavCard({ name, rating, c }: { name: string; rating: number; c: Colors }) {
  return (
    <View style={[styles.favCard, { backgroundColor: c.favCard }]}>
      <View style={[styles.favAvatar, { backgroundColor: c.avatar }]}>
        <Text style={[styles.favAvatarLetter, { color: c.accent }]}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={[styles.favName, { color: c.name }]} numberOfLines={2}>{name}</Text>
      <View style={[styles.favRating, { backgroundColor: c.favRating }]}>
        <Text style={[styles.favRatingStar, { color: c.star }]}>★</Text>
        <Text style={[styles.favRatingVal, { color: c.accent }]}>{rating.toFixed(1)}</Text>
      </View>
    </View>
  )
}

function NearbyCard({ name, sub, rating, c }: { name: string; sub: string; rating: number; c: Colors }) {
  return (
    <View style={[styles.nearCard, { borderBottomColor: c.cardBorder }]}>
      <View style={[styles.nearAvatar, { backgroundColor: c.avatar }]}>
        <Text style={[styles.nearAvatarLetter, { color: c.accent }]}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.nearInfo}>
        <Text style={[styles.nearName, { color: c.name }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.nearSub, { color: c.sub }]} numberOfLines={1}>{sub}</Text>
      </View>
      <View style={styles.nearRating}>
        <Text style={[styles.nearRatingStar, { color: c.star }]}>★</Text>
        <Text style={[styles.nearRatingVal, { color: c.accent }]}>{rating.toFixed(1)}</Text>
      </View>
    </View>
  )
}


export default function HomeScreen() {
  const [favCafes, setFavCafes] = useState<FavCafe[]>([])
  const [nearbyCafes, setNearbyCafes] = useState<OsmCafe[]>([])
  const [loading, setLoading] = useState(true)
  const { email, logout } = useAuth()
  const router = useRouter()
  const scheme = useColorScheme()
  const c = scheme === 'dark' ? DARK : LIGHT

  useEffect(() => {
    if (typeof document !== 'undefined' && !document.querySelector('#dancing-script-font')) {
      const link = document.createElement('link')
      link.id = 'dancing-script-font'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap'
      document.head.appendChild(link)
    }
  }, [])

  const loadFavorites = useCallback(() => {
    if (!email) { setFavCafes([]); return }
    AsyncStorage.getItem(`map_favorites_data_${email}`).then(v => {
      setFavCafes(v ? (Object.values(JSON.parse(v)) as FavCafe[]) : [])
    })
  }, [email])

  useEffect(() => { loadFavorites() }, [loadFavorites])
  useFocusEffect(useCallback(() => { loadFavorites() }, [loadFavorites]))

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchOsmCafes(), getUserLocation()]).then(([elements, userPos]) => {
      const cafes: OsmCafe[] = elements.map((e: any) => ({
        id: String(e.id),
        name: e.tags?.name || 'Café',
        lat: e.lat,
        lon: e.lon,
        rating: ratingFor(String(e.id)),
        distanceKm: userPos ? haversineKm(userPos.lat, userPos.lon, e.lat, e.lon) : undefined,
      }))
      cafes.sort((a, b) =>
        a.distanceKm !== undefined && b.distanceKm !== undefined
          ? a.distanceKm - b.distanceKm
          : b.rating - a.rating
      )
      setNearbyCafes(cafes.slice(0, 25))
      setLoading(false)
    })
  }, [])

  const favIds = new Set(favCafes.map(f => f.id))
  const nearbyFiltered = nearbyCafes.filter(c => !favIds.has(c.id))

  const handleLogout = () => { logout(); router.replace('/login') }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={[styles.header, { backgroundColor: c.header }]}>
            {email && <Text style={[styles.emailText, { color: c.sub }]}>{email}</Text>}
            <View style={styles.headerCenter}>
              <Text style={[styles.title, { color: c.title, fontFamily: "'Dancing Script', cursive" } as any]}>Cafe Hopper</Text>
            </View>
            <TouchableOpacity style={[styles.signOutBtn, { borderColor: c.signOutBdr }]} onPress={handleLogout}>
              <Text style={[styles.signOutText, { color: c.signOutTxt }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
            {favCafes.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: c.label }]}>Favorites</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favRow}>
                  {favCafes.map(fav => (
                    <FavCard key={fav.id} name={fav.name} rating={fav.rating} c={c} />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.label }]}>Cafes Near You</Text>
              {loading ? (
                <Text style={[styles.loadingText, { color: c.loading }]}>Finding cafes…</Text>
              ) : nearbyFiltered.map(cafe => (
                <NearbyCard
                  key={cafe.id}
                  name={cafe.name}
                  sub={cafe.distanceKm !== undefined
                    ? `${(cafe.distanceKm * 0.621371).toFixed(1)} mi away`
                    : 'Irvine, CA'}
                  rating={cafe.rating}
                  c={c}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.right}>
          <FriendsPanel />
        </View>
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { flex: 1, flexDirection: 'row', padding: 16, gap: 12 },
  left: { flex: 0.7, flexDirection: 'column' },
  right: { flex: 0.3 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 14, marginBottom: 16 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerSpacer: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 40, fontWeight: '700' },
  emailText: { fontSize: 12, flex: 1 },
  signOutBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  signOutText: { fontSize: 12, fontWeight: '700' },

  scrollContent: { paddingBottom: 20 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  loadingText: { fontSize: 13, fontStyle: 'italic' },

  favRow: { gap: 10, paddingRight: 4 },
  favCard: { width: 110, borderRadius: 16, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  favAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  favAvatarLetter: { fontSize: 20, fontWeight: '800' },
  favName: { fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 16, marginBottom: 6 },
  favRating: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  favRatingStar: { fontSize: 10, marginRight: 2 },
  favRatingVal: { fontSize: 11, fontWeight: '700' },

  nearCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  nearAvatar: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 },
  nearAvatarLetter: { fontSize: 15, fontWeight: '700' },
  nearInfo: { flex: 1 },
  nearName: { fontSize: 14, fontWeight: '600', marginBottom: 1 },
  nearSub: { fontSize: 12 },
  nearRating: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  nearRatingStar: { fontSize: 11, marginRight: 2 },
  nearRatingVal: { fontSize: 12, fontWeight: '700' },
})
