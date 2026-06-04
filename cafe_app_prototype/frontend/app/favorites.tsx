import { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/context/auth'
import { ThemedView } from '@/components/themed-view'
import { IconSymbol } from '@/components/ui/icon-symbol'

import API from '@/constants/api'

type Cafe = { id: number; name: string; location: string; description: string; logo_url: string }
type MapCafe = { id: string; name: string; rating: number; street?: string; city: string; hours?: string; cuisine?: string }

type ListItem =
  | { kind: 'db'; cafe: Cafe }
  | { kind: 'map'; cafe: MapCafe }

export default function FavoritesScreen() {
  const [cafes, setCafes] = useState<Cafe[]>([])
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [failedLogos, setFailedLogos] = useState<Set<number>>(new Set())
  const [mapFavs, setMapFavs] = useState<MapCafe[]>([])
  const { email, token } = useAuth()
  const router = useRouter()

  useFocusEffect(useCallback(() => {
    if (!email) return
    AsyncStorage.getItem(`map_favorites_data_${email}`).then(v => {
      setMapFavs(v ? Object.values(JSON.parse(v)) : [])
    })
  }, [email]))

  useEffect(() => {
    fetch(`${API}/api/cafes`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCafes(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!email) { setFavorites(new Set()); setMapFavs([]); return }
    AsyncStorage.getItem(`favorites_${email}`).then(v => {
      if (v) setFavorites(new Set(JSON.parse(v)))
    })
    AsyncStorage.getItem(`map_favorites_data_${email}`).then(v => {
      if (v) setMapFavs(Object.values(JSON.parse(v)))
    })
  }, [email])

  useEffect(() => {
    if (!token || !email) return
    fetch(`${API}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFavorites(new Set(data))
          AsyncStorage.setItem(`favorites_${email}`, JSON.stringify(data))
        }
      })
      .catch(() => {})
  }, [token, email])

  const toggleFavorite = async (cafeId: number) => {
    if (!token || !email) return
    const isFav = favorites.has(cafeId)
    setFavorites(prev => {
      const next = new Set(prev)
      isFav ? next.delete(cafeId) : next.add(cafeId)
      AsyncStorage.setItem(`favorites_${email}`, JSON.stringify([...next]))
      return next
    })
    const res = await fetch(`${API}/api/favorites/${cafeId}`, {
      method: isFav ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null)
    if (!res || !res.ok) {
      setFavorites(prev => {
        const rollback = new Set(prev)
        isFav ? rollback.add(cafeId) : rollback.delete(cafeId)
        AsyncStorage.setItem(`favorites_${email}`, JSON.stringify([...rollback]))
        return rollback
      })
    }
  }

  const removeMapFav = (id: string) => {
    setMapFavs(prev => prev.filter(c => c.id !== id))
    if (!email) return
    AsyncStorage.getItem(`map_favorites_data_${email}`).then(v => {
      const data = v ? JSON.parse(v) : {}
      delete data[id]
      AsyncStorage.setItem(`map_favorites_data_${email}`, JSON.stringify(data))
      AsyncStorage.setItem(`map_favorites_${email}`, JSON.stringify(Object.keys(data)))
    })
  }

  const items: ListItem[] = [
    ...cafes.filter(c => favorites.has(c.id)).map(c => ({ kind: 'db' as const, cafe: c })),
    ...mapFavs.map(c => ({ kind: 'map' as const, cafe: c })),
  ]

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <IconSymbol name="chevron.left" size={22} color="#7d5236" />
            </TouchableOpacity>
            <Text style={styles.title}>My Favorites</Text>
            <View style={{ width: 22 }} />
          </View>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptyText}>Heart a cafe on the home screen or map to save it here.</Text>
          </View>
        ) : (
          items.map(item => {
            if (item.kind === 'db') {
              const c = item.cafe
              return (
                <View key={`db-${c.id}`} style={styles.cafeCard}>
                  {!failedLogos.has(c.id) && (
                    <Image
                      source={{ uri: c.logo_url }}
                      style={styles.logo}
                      resizeMode="contain"
                      onError={() => setFailedLogos(prev => new Set(prev).add(c.id))}
                    />
                  )}
                  <View style={styles.cafeInfo}>
                    <Text style={styles.cafeName}>{c.name}</Text>
                    {c.location ? <Text style={styles.cafeLocation}>{c.location}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => toggleFavorite(c.id)} style={styles.heartButton} activeOpacity={0.7}>
                    <IconSymbol name={favorites.has(c.id) ? 'heart.fill' : 'heart'} size={24} color={favorites.has(c.id) ? '#7d5236' : '#c4a882'} />
                  </TouchableOpacity>
                </View>
              )
            }
            const c = item.cafe
            return (
              <View key={`map-${c.id}`} style={styles.cafeCard}>
                <View style={styles.cafeInfo}>
                  <Text style={styles.cafeName}>{c.name}</Text>
                  <Text style={styles.cafeLocation}>{c.street ? `${c.street}, ${c.city ?? 'Irvine, CA'}` : (c.city ?? 'Irvine, CA')}</Text>
                </View>
                <TouchableOpacity onPress={() => removeMapFav(c.id)} style={styles.heartButton} activeOpacity={0.7}>
                  <IconSymbol name="heart.fill" size={24} color="#7d5236" />
                </TouchableOpacity>
              </View>
            )
          })
        )}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { backgroundColor: '#fbf1e6', borderRadius: 24, padding: 20, marginBottom: 18, shadowColor: '#8b5e34', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 26, fontWeight: '700', color: '#4b3723', flex: 1, textAlign: 'center' },
  emptyCard: { backgroundColor: '#fff7ef', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#8b5e34', shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#4b3723', marginBottom: 6 },
  emptyText: { fontSize: 15, color: '#7a5f4d', textAlign: 'center' },
  cafeCard: { backgroundColor: '#fff8f2', borderRadius: 20, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#8b5e34', shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  logo: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#f3e8dc', marginRight: 14, flexShrink: 0 },
  cafeInfo: { flex: 1 },
  cafeName: { fontSize: 17, fontWeight: '700', color: '#4f3421', marginBottom: 2 },
  cafeLocation: { fontSize: 12, color: '#9b7a5e', marginBottom: 4 },
  heartButton: { paddingLeft: 12, paddingVertical: 4 },
})
