import { useState, useEffect, useCallback } from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { IconSymbol } from '@/components/ui/icon-symbol'
import CafeMap from '@/components/cafe-map'
import { useAuth } from '@/context/auth'
import { useLocation } from '@/context/location'
import { useLanguage, type LangCode } from '@/context/language'

const API = 'http://localhost:3000'

const CUISINE_TR: Partial<Record<string, Partial<Record<LangCode, string>>>> = {
  coffee:       { es: 'Café',           fr: 'Café',          zh: '咖啡',    ja: 'コーヒー',     ko: '커피' },
  coffee_shop:  { es: 'Café',            fr: 'Café',          zh: '咖啡馆',  ja: 'カフェ',       ko: '카페' },
  tea:          { es: 'Té',             fr: 'Thé',           zh: '茶',      ja: 'お茶',         ko: '차' },
  bubble_tea:   { en: 'Boba tea', es: 'Boba tea', fr: 'Boba tea', zh: '波霸奶茶', ja: 'ボバティー', ko: '버블티' },
  cake:         { es: 'Pastel',         fr: 'Gâteau',        zh: '蛋糕',    ja: 'ケーキ',       ko: '케이크' },
  sandwich:     { es: 'Sándwich',       fr: 'Sandwich',      zh: '三明治',  ja: 'サンドイッチ', ko: '샌드위치' },
  ice_cream:    { es: 'Helado',         fr: 'Glace',         zh: '冰淇淋',  ja: 'アイスクリーム', ko: '아이스크림' },
  juice:        { es: 'Jugo',           fr: 'Jus',           zh: '果汁',    ja: 'ジュース',     ko: '주스' },
  smoothie:     { es: 'Batido',         fr: 'Smoothie',      zh: '冰沙',    ja: 'スムージー',   ko: '스무디' },
  pastry:       { es: 'Pastelería',     fr: 'Pâtisserie',    zh: '糕点',    ja: 'ペストリー',   ko: '패스트리' },
  bagel:        { es: 'Bagel',          fr: 'Bagel',         zh: '百吉饼',  ja: 'ベーグル',     ko: '베이글' },
  crepe:        { es: 'Crep',           fr: 'Crêpe',         zh: '可丽饼',  ja: 'クレープ',     ko: '크레페' },
  waffle:       { es: 'Gofre',          fr: 'Gaufre',        zh: '华夫饼',  ja: 'ワッフル',     ko: '와플' },
}

function translateCuisine(raw: string, lang: LangCode): string {
  const key = raw.toLowerCase().trim()
  const translation = CUISINE_TR[key]?.[lang]
  if (translation) return translation
  return raw.replace(/_shop$/i, '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

type SelectedCafe = { id: string; name: string; rating: number; street?: string; city: string; hours?: string; cuisine?: string }

const DAY_IDX: Record<string, number> = { Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 0 }

function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function dayInRange(day: number, from: number, to: number): boolean {
  return from <= to ? day >= from && day <= to : day >= from || day <= to
}

type HoursStrings = { open24h: string; openNow: string; closes: string; closedOpens: string }

function formatHours(raw: string, s: HoursStrings): string {
  if (!raw?.trim()) return raw
  const trimmed = raw.trim()
  if (trimmed === '24/7') return s.open24h

  const now = new Date()
  const todayIdx = now.getDay()
  const curMins = now.getHours() * 60 + now.getMinutes()

  for (const rule of trimmed.split(';').map(s => s.trim())) {
    if (!rule || /^PH/i.test(rule)) continue

    // Find where the first time value starts
    const timeIdx = rule.search(/\b\d{2}:\d{2}/)
    if (timeIdx < 0) continue

    const dayPart = rule.slice(0, timeIdx).trim()
    const timePart = rule.slice(timeIdx).trim()

    // Check if today is covered by the day spec (empty = every day)
    let appliesToday = dayPart.length === 0
    if (!appliesToday) {
      for (const seg of dayPart.replace(/\s/g, '').split(',')) {
        const range = seg.match(/^([A-Z][a-z])-([A-Z][a-z])$/)
        if (range) {
          const f = DAY_IDX[range[1]], t = DAY_IDX[range[2]]
          if (f !== undefined && t !== undefined && dayInRange(todayIdx, f, t)) { appliesToday = true; break }
        } else if (DAY_IDX[seg] === todayIdx) {
          appliesToday = true; break
        }
      }
    }
    if (!appliesToday) continue

    // Parse all time intervals in this rule (handles split hours like 08:00-12:00,13:00-18:00)
    const intervals = [...timePart.matchAll(/(\d{2}:\d{2})-(\d{2}:\d{2})/g)]
    if (intervals.length === 0) continue

    for (const [, t1, t2] of intervals) {
      const [oh, om] = t1.split(':').map(Number)
      const [ch, cm] = t2.split(':').map(Number)
      const openMins = oh * 60 + om, closeMins = ch * 60 + cm
      if (curMins >= openMins && curMins < closeMins) return `${s.openNow} · ${s.closes} ${fmtTime(t2)}`
      if (curMins < openMins) return `${s.closedOpens} ${fmtTime(t1)}`
    }
    break // past today's hours — fall through to show the prettified schedule
  }

  // Fallback: clean up day abbreviations and convert 24h times
  return trimmed
    .replace(/\bMo\b/g, 'Mon').replace(/\bTu\b/g, 'Tue').replace(/\bWe\b/g, 'Wed')
    .replace(/\bTh\b/g, 'Thu').replace(/\bFr\b/g, 'Fri').replace(/\bSa\b/g, 'Sat').replace(/\bSu\b/g, 'Sun')
    .replace(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun),(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/g, '$1/$2')
    .replace(/(\d{2}):(\d{2})/g, (_, h, min) => fmtTime(`${h}:${min}`))
    .replace(/;/g, ' · ')
}

function StarRating({ rating }: { rating: number }) {
  return (
    <Text style={styles.ratingText}>
      <Text style={styles.starIcon}>★ </Text>
      {rating.toFixed(1)} / 5
    </Text>
  )
}

export default function ExploreScreen() {
  const [selectedCafe, setSelectedCafe] = useState<SelectedCafe | null>(null)
  const [mapFavs, setMapFavs] = useState<Set<string>>(new Set())
  const [nearbyUsers, setNearbyUsers] = useState<{ lat: number; lng: number }[]>([])
  const { email, token } = useAuth()
  const { showLocation } = useLocation()
  const { t, lang } = useLanguage()

  const fetchNearbyUsers = useCallback(() => {
    if (!showLocation) { setNearbyUsers([]); return }
    fetch(`${API}/api/users/locations`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setNearbyUsers(data) })
      .catch(() => {})
  }, [showLocation, token])

  useEffect(() => { fetchNearbyUsers() }, [fetchNearbyUsers])
  useFocusEffect(useCallback(() => { fetchNearbyUsers() }, [fetchNearbyUsers]))

  useEffect(() => {
    if (!email) return
    AsyncStorage.getItem(`map_favorites_${email}`).then(v => {
      if (v) setMapFavs(new Set(JSON.parse(v)))
    })
  }, [email])

  useFocusEffect(useCallback(() => {
    if (!email) return
    AsyncStorage.getItem(`map_favorites_${email}`).then(v => {
      setMapFavs(v ? new Set(JSON.parse(v)) : new Set())
    })
  }, [email]))

  const toggleMapFav = async (cafe: SelectedCafe) => {
    if (!email) return
    const { id } = cafe
    const isFav = mapFavs.has(id)
    const next = new Set(mapFavs)
    isFav ? next.delete(id) : next.add(id)
    setMapFavs(next)
    await AsyncStorage.setItem(`map_favorites_${email}`, JSON.stringify([...next]))
    const v = await AsyncStorage.getItem(`map_favorites_data_${email}`)
    const data = v ? JSON.parse(v) : {}
    if (isFav) delete data[id]; else data[id] = cafe
    await AsyncStorage.setItem(`map_favorites_data_${email}`, JSON.stringify(data))
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>{t.explore}</ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>{t.exploreSubtitle}</ThemedText>
      </View>

      <View style={styles.mapCard}>
        <CafeMap onSelectCafe={setSelectedCafe} nearbyUsers={nearbyUsers} />

        <View style={styles.infoBadge}>
          {selectedCafe ? (
            <>
              <View style={styles.badgeRow}>
                <Text style={styles.cafeName} numberOfLines={1}>{selectedCafe.name}</Text>
                <TouchableOpacity onPress={() => toggleMapFav(selectedCafe)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.heartBtn}>
                  <IconSymbol name={mapFavs.has(selectedCafe.id) ? 'heart.fill' : 'heart'} size={20} color={mapFavs.has(selectedCafe.id) ? '#7d5236' : '#c4a882'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedCafe(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
              <StarRating rating={selectedCafe.rating} />
              <Text style={styles.cafeDetail}>{t.locationLabel}: {selectedCafe.street ? `${selectedCafe.street}, ${selectedCafe.city}` : selectedCafe.city}</Text>
              {selectedCafe.hours && <Text style={styles.cafeDetail}>{t.hoursLabel}: {formatHours(selectedCafe.hours, t)}</Text>}
              {selectedCafe.cuisine && <Text style={styles.cafeDetail}>{t.specialtyLabel}: {translateCuisine(selectedCafe.cuisine, lang)}</Text>}
            </>
          ) : (
            <>
              <ThemedText type="defaultSemiBold" style={styles.badgeTitle}>{t.topPicksNearby}</ThemedText>
              <ThemedText style={styles.badgeSubtitle}>{t.tapMarker}</ThemedText>
            </>
          )}
        </View>
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { marginBottom: 18 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 6, color: '#4b3723' },
  subtitle: { fontSize: 16, color: '#7d5a44' },
  mapCard: { flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: '#fbf1e6', shadowColor: '#8b5e34', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  infoBadge: { position: 'absolute', left: 18, right: 18, bottom: 18, zIndex: 1000, backgroundColor: 'rgba(251,241,230,0.97)', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18 },
  badgeTitle: { fontSize: 18, color: '#4b3723', marginBottom: 4 },
  badgeSubtitle: { fontSize: 14, color: '#7a5f4d' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cafeName: { fontSize: 18, fontWeight: '700', color: '#4b3723', flex: 1, marginRight: 8 },
  closeBtn: { fontSize: 16, color: '#9b7a5e', fontWeight: '600' },
  heartBtn: { marginRight: 8 },
  ratingText: { fontSize: 14, color: '#7a5f4d', marginBottom: 6 },
  starIcon: { fontSize: 14, color: '#c8973a' },
  ratingNum: { fontSize: 13, color: '#7a5f4d', marginLeft: 4 },
  cafeDesc: { fontSize: 13, color: '#7a5f4d', lineHeight: 19 },
  cafeDetail: { fontSize: 13, color: '#7a5f4d', lineHeight: 20, marginTop: 2 },
})
