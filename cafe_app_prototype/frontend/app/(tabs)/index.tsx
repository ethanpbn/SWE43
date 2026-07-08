import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect, useRouter } from 'expo-router'
import { useAuth } from '@/context/auth'
import { ThemedView } from '@/components/themed-view'
import FriendsPanel from '@/components/friends-panel'
import { useColorScheme } from '@/hooks/use-color-scheme'

const LIGHT = {
  card:        '#fff8f2',
  cardBorder:  '#f0e4d4',
  header:      '#fbf1e6',
  avatar:      '#e8d5c0',
  favCard:     '#fff8f2',
  favRating:   '#fbf1e6',
  title:       '#4b3723',
  name:        '#3d2b1a',
  sub:         '#9b7a5e',
  accent:      '#7d5236',
  star:        '#c8973a',
  signOutBg:   'transparent',
  signOutBdr:  '#e8d5c0',
  signOutTxt:  '#e74c3c',
  label:       '#9b7a5e',
  loading:     '#b09080',
  dropdown:    '#fdf5ed',
  dropBorder:  '#e8d5c0',
  inputBg:     '#ffffff',
  inputBorder: '#e0d0c0',
  btnBg:       '#7d5236',
  btnTxt:      '#ffffff',
  barBg:       '#f0e4d4',
  reviewBg:    '#fffaf5',
  starEmpty:   '#ddd',
}
const DARK = {
  card:        '#1e1208',
  cardBorder:  '#2e1e0e',
  header:      '#1a0f06',
  avatar:      '#3a2410',
  favCard:     '#1e1208',
  favRating:   '#2e1e0e',
  title:       '#f0ddc8',
  name:        '#e8d0b8',
  sub:         '#7d6050',
  accent:      '#c8973a',
  star:        '#c8973a',
  signOutBg:   'transparent',
  signOutBdr:  '#3a2410',
  signOutTxt:  '#e07060',
  label:       '#6a5040',
  loading:     '#6a5040',
  dropdown:    '#180e04',
  dropBorder:  '#2e1e0e',
  inputBg:     '#1a0f06',
  inputBorder: '#3a2410',
  btnBg:       '#c8973a',
  btnTxt:      '#1a0f06',
  barBg:       '#2e1e0e',
  reviewBg:    '#1e1208',
  starEmpty:   '#3a2410',
}

// 5 sets of 3 cafe photos from Unsplash
const PHOTO_SETS = [
  [
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=80',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&q=80',
  ],
  [
    'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=500&q=80',
    'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=500&q=80',
    'https://images.unsplash.com/photo-1511081692775-05d0f180a065?w=500&q=80',
  ],
  [
    'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=500&q=80',
    'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&q=80',
    'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=500&q=80',
  ],
  [
    'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=500&q=80',
    'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=500&q=80',
    'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=500&q=80',
  ],
  [
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=500&q=80',
    'https://images.unsplash.com/photo-1507914372368-b2b085b925a1?w=500&q=80',
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80',
  ],
]


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

function getCafePhotos(id: string): string[] {
  const seed = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return PHOTO_SETS[Math.abs(seed) % PHOTO_SETS.length]
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
type Review = { id: string; rating: number; text: string; author: string; date: string }
type Colors = typeof LIGHT

function FavCard({ name, rating, selected, c, onPress }: {
  name: string
  rating: number
  selected: boolean
  c: Colors
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.favCard,
        { backgroundColor: c.favCard },
        selected && { borderWidth: 2, borderColor: c.accent },
      ]}
    >
      <View style={[styles.favAvatar, { backgroundColor: c.avatar }]}>
        <Text style={[styles.favAvatarLetter, { color: c.accent }]}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={[styles.favName, { color: c.name }]} numberOfLines={2}>{name}</Text>
      <View style={[styles.favRating, { backgroundColor: c.favRating }]}>
        <Text style={[styles.favRatingStar, { color: c.star }]}>★</Text>
        <Text style={[styles.favRatingVal, { color: c.accent }]}>{rating.toFixed(1)}</Text>
      </View>
    </TouchableOpacity>
  )
}

function StarChart({ reviews, c }: { reviews: Review[]; c: Colors }) {
  const data = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }))
  const max = Math.max(...data.map(d => d.count), 1)
  const total = reviews.length
  const avg = total > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
    : '—'

  return (
    <View style={styles.chart}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartAvg, { color: c.star }]}>{avg}</Text>
        <Text style={[styles.chartTitle, { color: c.sub }]}>
          {'★ · '}{total} {total === 1 ? 'review' : 'reviews'}
        </Text>
      </View>
      {data.map(({ star, count }) => (
        <View key={star} style={styles.chartRow}>
          <Text style={[styles.chartLabel, { color: c.sub }]}>{star}★</Text>
          <View style={[styles.chartBarBg, { backgroundColor: c.barBg }]}>
            <View
              style={[
                styles.chartBar,
                { width: `${(count / max) * 100}%` as any, backgroundColor: c.star },
              ]}
            />
          </View>
          <Text style={[styles.chartCount, { color: c.sub }]}>{count}</Text>
        </View>
      ))}
    </View>
  )
}

function StarSelector({ value, onChange, c }: { value: number; onChange: (v: number) => void; c: Colors }) {
  return (
    <View style={styles.starSelector}>
      {[1, 2, 3, 4, 5].map(s => (
        <TouchableOpacity key={s} onPress={() => onChange(s)}>
          <Text style={[styles.starBtn, { color: s <= value ? c.star : c.starEmpty }]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function ReviewItem({ review, c }: { review: Review; c: Colors }) {
  const filled = '★'.repeat(review.rating)
  const empty = '☆'.repeat(5 - review.rating)
  return (
    <View style={[styles.reviewItem, { backgroundColor: c.reviewBg, borderColor: c.dropBorder }]}>
      <View style={styles.reviewHeader}>
        <Text style={[styles.reviewAuthor, { color: c.name }]}>{review.author}</Text>
        <Text style={{ color: c.star, fontSize: 11 }}>{filled}{empty}</Text>
        <Text style={[styles.reviewDate, { color: c.sub }]}>{review.date}</Text>
      </View>
      <Text style={[styles.reviewText, { color: c.sub }]}>{review.text}</Text>
    </View>
  )
}

function CafeDropdown({ cafeId, c, reviews, onAddReview }: {
  cafeId: string
  c: Colors
  reviews: Review[]
  onAddReview: (r: Omit<Review, 'id' | 'date'>) => void
}) {
  const [newRating, setNewRating] = useState(5)
  const [newText, setNewText] = useState('')
  const photos = getCafePhotos(cafeId)

  const handleSubmit = () => {
    const trimmed = newText.trim()
    if (!trimmed) return
    onAddReview({ rating: newRating, text: trimmed, author: 'You' })
    setNewText('')
    setNewRating(5)
  }

  return (
    <View style={[styles.dropdown, { backgroundColor: c.dropdown, borderColor: c.dropBorder }]}>
      {/* Left: photos */}
      <View style={styles.dropPhotos}>
        <Image source={{ uri: photos[0] }} style={styles.photoMain} resizeMode="cover" />
        <View style={styles.photoRow}>
          <Image source={{ uri: photos[1] }} style={styles.photoThumb} resizeMode="cover" />
          <Image source={{ uri: photos[2] }} style={styles.photoThumb} resizeMode="cover" />
        </View>
      </View>

      {/* Right: chart + reviews + form */}
      <View style={styles.dropReviews}>
        <StarChart reviews={reviews} c={c} />

        <ScrollView
          style={styles.reviewList}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {reviews.length === 0 ? (
            <Text style={[styles.noReviews, { color: c.sub }]}>No reviews yet. Be the first!</Text>
          ) : (
            reviews.map(r => <ReviewItem key={r.id} review={r} c={c} />)
          )}
        </ScrollView>

        <View style={[styles.addReviewForm, { borderTopColor: c.dropBorder }]}>
          <Text style={[styles.addReviewLabel, { color: c.name }]}>Add a Review</Text>
          <StarSelector value={newRating} onChange={setNewRating} c={c} />
          <TextInput
            value={newText}
            onChangeText={setNewText}
            placeholder="Share your experience…"
            placeholderTextColor={c.sub}
            style={[
              styles.reviewInput,
              { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.name },
            ]}
            multiline
            numberOfLines={2}
          />
          <TouchableOpacity
            style={[styles.postBtn, { backgroundColor: c.btnBg }]}
            onPress={handleSubmit}
          >
            <Text style={[styles.postBtnTxt, { color: c.btnTxt }]}>Post Review</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

function NearbyRow({ cafe, expanded, c, reviews, onPress, onAddReview }: {
  cafe: OsmCafe
  expanded: boolean
  c: Colors
  reviews: Review[]
  onPress: () => void
  onAddReview: (r: Omit<Review, 'id' | 'date'>) => void
}) {
  const sub = cafe.distanceKm !== undefined
    ? `${(cafe.distanceKm * 0.621371).toFixed(1)} mi away`
    : 'Irvine, CA'

  return (
    <View style={[styles.nearRow, { borderBottomColor: c.cardBorder, borderBottomWidth: expanded ? 0 : 1 }]}>
      <TouchableOpacity style={styles.nearCard} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.nearAvatar, { backgroundColor: c.avatar }]}>
          <Text style={[styles.nearAvatarLetter, { color: c.accent }]}>
            {cafe.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.nearInfo}>
          <Text style={[styles.nearName, { color: c.name }]} numberOfLines={1}>{cafe.name}</Text>
          <Text style={[styles.nearSub, { color: c.sub }]} numberOfLines={1}>{sub}</Text>
        </View>
        <View style={styles.nearRating}>
          <Text style={[styles.nearRatingStar, { color: c.star }]}>★</Text>
          <Text style={[styles.nearRatingVal, { color: c.accent }]}>{cafe.rating.toFixed(1)}</Text>
        </View>
        <Text style={[styles.chevron, { color: c.sub }]}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <CafeDropdown cafeId={cafe.id} c={c} reviews={reviews} onAddReview={onAddReview} />
      )}
    </View>
  )
}

export default function HomeScreen() {
  const [favCafes, setFavCafes] = useState<FavCafe[]>([])
  const [nearbyCafes, setNearbyCafes] = useState<OsmCafe[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCafeId, setExpandedCafeId] = useState<string | null>(null)
  const [expandedFavId, setExpandedFavId] = useState<string | null>(null)
  const [cafeReviews, setCafeReviews] = useState<Record<string, Review[]>>({})
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

  const loadReviews = async (cafeId: string) => {
    if (cafeReviews[cafeId] !== undefined) return
    const stored = await AsyncStorage.getItem(`cafe_reviews_v2_${cafeId}`)
    const reviews: Review[] = stored ? JSON.parse(stored) : []
    setCafeReviews(prev => ({ ...prev, [cafeId]: reviews }))
  }

  const handleFavPress = (fav: FavCafe) => {
    if (expandedFavId === fav.id) {
      setExpandedFavId(null)
    } else {
      setExpandedFavId(fav.id)
      loadReviews(fav.id)
    }
  }

  const handleCafePress = (cafe: OsmCafe) => {
    if (expandedCafeId === cafe.id) {
      setExpandedCafeId(null)
    } else {
      setExpandedCafeId(cafe.id)
      loadReviews(cafe.id)
    }
  }

  const handleAddReview = async (cafeId: string, review: Omit<Review, 'id' | 'date'>) => {
    const newReview: Review = {
      ...review,
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
    }
    const updated = [...(cafeReviews[cafeId] || []), newReview]
    setCafeReviews(prev => ({ ...prev, [cafeId]: updated }))
    await AsyncStorage.setItem(`cafe_reviews_v2_${cafeId}`, JSON.stringify(updated))
  }

  const favIds = new Set(favCafes.map(f => f.id))
  const nearbyFiltered = nearbyCafes.filter(cafe => !favIds.has(cafe.id))
  const handleLogout = () => { logout(); router.replace('/login') }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={[styles.header, { backgroundColor: c.header }]}>
            <View style={styles.headerSide}>
              {email && <Text style={[styles.emailText, { color: c.sub }]}>{email}</Text>}
            </View>
            <Text style={[styles.title, { color: c.title, fontFamily: "'Dancing Script', cursive" } as any]}>
              Cafe Hopper
            </Text>
            <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
              <TouchableOpacity style={[styles.signOutBtn, { borderColor: c.signOutBdr }]} onPress={handleLogout}>
                <Text style={[styles.signOutText, { color: c.signOutTxt }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
            {favCafes.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: c.label }]}>Favorites</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favRow}>
                  {favCafes.map(fav => (
                    <FavCard
                      key={fav.id}
                      name={fav.name}
                      rating={fav.rating}
                      selected={expandedFavId === fav.id}
                      c={c}
                      onPress={() => handleFavPress(fav)}
                    />
                  ))}
                </ScrollView>
                {expandedFavId && cafeReviews[expandedFavId] !== undefined && (
                  <CafeDropdown
                    cafeId={expandedFavId}
                    c={c}
                    reviews={cafeReviews[expandedFavId]}
                    onAddReview={r => handleAddReview(expandedFavId, r)}
                  />
                )}
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.label }]}>Cafes Near You</Text>
              {loading ? (
                <Text style={[styles.loadingText, { color: c.loading }]}>Finding cafes…</Text>
              ) : nearbyFiltered.map(cafe => (
                <NearbyRow
                  key={cafe.id}
                  cafe={cafe}
                  expanded={expandedCafeId === cafe.id}
                  c={c}
                  reviews={cafeReviews[cafe.id] || []}
                  onPress={() => handleCafePress(cafe)}
                  onAddReview={r => handleAddReview(cafe.id, r)}
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

  header: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 14, marginBottom: 16 },
  headerSide: { flex: 1 },
  title: { fontSize: 40, fontWeight: '700' },
  emailText: { fontSize: 12 },
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

  // Nearby rows
  nearRow: { borderBottomWidth: 1 },
  nearCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  nearAvatar: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 },
  nearAvatarLetter: { fontSize: 15, fontWeight: '700' },
  nearInfo: { flex: 1 },
  nearName: { fontSize: 14, fontWeight: '600', marginBottom: 1 },
  nearSub: { fontSize: 12 },
  nearRating: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  nearRatingStar: { fontSize: 11, marginRight: 2 },
  nearRatingVal: { fontSize: 12, fontWeight: '700' },
  chevron: { fontSize: 10, marginLeft: 10 },

  // Dropdown panel
  dropdown: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropPhotos: { flex: 2, padding: 8, gap: 6 },
  photoMain: { height: 130, borderRadius: 8 },
  photoRow: { flexDirection: 'row', gap: 6 },
  photoThumb: { flex: 1, height: 85, borderRadius: 8 },
  dropReviews: { flex: 3, padding: 10 },

  // Star chart
  chart: { marginBottom: 8 },
  chartHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 6 },
  chartAvg: { fontSize: 22, fontWeight: '800' },
  chartTitle: { fontSize: 11 },
  chartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  chartLabel: { width: 22, fontSize: 11, marginRight: 6 },
  chartBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden', marginRight: 6 },
  chartBar: { height: 8, borderRadius: 4 },
  chartCount: { width: 16, fontSize: 11, textAlign: 'right' },

  // Reviews list
  reviewList: { maxHeight: 150, marginBottom: 8 },
  reviewItem: { borderRadius: 8, padding: 8, marginBottom: 6, borderWidth: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  reviewAuthor: { fontSize: 11, fontWeight: '700' },
  reviewDate: { fontSize: 10, marginLeft: 'auto' as any },
  reviewText: { fontSize: 11, lineHeight: 15 },
  noReviews: { fontSize: 12, fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },

  // Add review
  addReviewForm: { borderTopWidth: 1, paddingTop: 8 },
  addReviewLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  starSelector: { flexDirection: 'row', gap: 2, marginBottom: 6 },
  starBtn: { fontSize: 22 },
  reviewInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    marginBottom: 6,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  postBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, alignItems: 'center' },
  postBtnTxt: { fontSize: 12, fontWeight: '700' },
})
