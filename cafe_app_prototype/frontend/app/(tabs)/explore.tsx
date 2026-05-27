import { useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import CafeMap from '@/components/cafe-map'

type SelectedCafe = { name: string; rating: number; address?: string; hours?: string; cuisine?: string }

const DAY_IDX: Record<string, number> = { Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 0 }

function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function formatHours(raw: string): string {
  if (raw.trim() === '24/7') return 'Open 24 hours'

  const now = new Date()
  const todayIdx = now.getDay()
  const curMins = now.getHours() * 60 + now.getMinutes()

  for (const rule of raw.split(';').map(s => s.trim())) {
    const m = rule.match(/^([A-Z][a-z])(?:-([A-Z][a-z]))?\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/)
    if (!m) continue
    const from = DAY_IDX[m[1]], to = m[2] ? DAY_IDX[m[2]] : from
    if (from === undefined || to === undefined) continue
    const inRange = from <= to ? todayIdx >= from && todayIdx <= to : todayIdx >= from || todayIdx <= to
    if (!inRange) continue
    const [oh, om] = m[3].split(':').map(Number)
    const [ch, cm] = m[4].split(':').map(Number)
    const openMins = oh * 60 + om, closeMins = ch * 60 + cm
    if (curMins >= openMins && curMins < closeMins) return `Open now · Closes ${fmtTime(m[4])}`
    if (curMins < openMins) return `Closed · Opens ${fmtTime(m[3])}`
    return `Closed · Opens ${fmtTime(m[3])} tomorrow`
  }

  return raw
    .replace(/\bMo\b/g, 'Mon').replace(/\bTu\b/g, 'Tue').replace(/\bWe\b/g, 'Wed')
    .replace(/\bTh\b/g, 'Thu').replace(/\bFr\b/g, 'Fri').replace(/\bSa\b/g, 'Sat').replace(/\bSu\b/g, 'Sun')
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

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Explore</ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>Find cafes, see routes, and explore the map.</ThemedText>
      </View>

      <View style={styles.mapCard}>
        <CafeMap onSelectCafe={setSelectedCafe} />

        <View style={styles.infoBadge}>
          {selectedCafe ? (
            <>
              <View style={styles.badgeRow}>
                <Text style={styles.cafeName} numberOfLines={1}>{selectedCafe.name}</Text>
                <TouchableOpacity onPress={() => setSelectedCafe(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
              <StarRating rating={selectedCafe.rating} />
              {selectedCafe.address && <Text style={styles.cafeDetail}>Location: {selectedCafe.address}</Text>}
              {selectedCafe.hours && <Text style={styles.cafeDetail}>Hours: {formatHours(selectedCafe.hours)}</Text>}
              {selectedCafe.cuisine && <Text style={styles.cafeDetail}>Specialty: {selectedCafe.cuisine.replace(/_shop$/i, '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}</Text>}
            </>
          ) : (
            <>
              <ThemedText type="defaultSemiBold" style={styles.badgeTitle}>Top picks nearby</ThemedText>
              <ThemedText style={styles.badgeSubtitle}>Tap a marker to see details.</ThemedText>
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
  ratingText: { fontSize: 14, color: '#7a5f4d', marginBottom: 6 },
  starIcon: { fontSize: 14, color: '#c8973a' },
  ratingNum: { fontSize: 13, color: '#7a5f4d', marginLeft: 4 },
  cafeDesc: { fontSize: 13, color: '#7a5f4d', lineHeight: 19 },
  cafeDetail: { fontSize: 13, color: '#7a5f4d', lineHeight: 20, marginTop: 2 },
})
