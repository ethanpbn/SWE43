import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/context/auth'
import { ThemedView } from '@/components/themed-view'
import { IconSymbol } from '@/components/ui/icon-symbol'

const API = 'http://localhost:3000'

type Cafe = {
  id: number
  name: string
  location: string
  description: string
  logo_url: string
}

export default function FavoritesScreen() {
  const [cafes, setCafes] = useState<Cafe[]>([])
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [failedLogos, setFailedLogos] = useState<Set<number>>(new Set())
  const { email, token } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetch(`${API}/api/cafes`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCafes(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!email) { setFavorites(new Set()); return }
    AsyncStorage.getItem(`favorites_${email}`).then(v => {
      if (v) setFavorites(new Set(JSON.parse(v)))
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

  const favoritedCafes = cafes.filter(c => favorites.has(c.id))

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <IconSymbol name="chevron.left" size={22} color="#7d5236" />
            </TouchableOpacity>
            <Text style={styles.title}>My Favorites</Text>
            <View style={{ width: 22 }} />
          </View>
          <Text style={styles.subtitle}>Cafes you've saved.</Text>
        </View>

        {favoritedCafes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptyText}>Heart a cafe on the home screen to save it here.</Text>
          </View>
        ) : (
          <FlatList
            data={favoritedCafes}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isFav = favorites.has(item.id)
              return (
                <View style={styles.cafeCard}>
                  {!failedLogos.has(item.id) && (
                    <Image
                      source={{ uri: item.logo_url }}
                      style={styles.logo}
                      resizeMode="contain"
                      onError={() => setFailedLogos(prev => new Set(prev).add(item.id))}
                    />
                  )}
                  <View style={styles.cafeInfo}>
                    <Text style={styles.cafeName}>{item.name}</Text>
                    {item.location ? <Text style={styles.cafeLocation}>{item.location}</Text> : null}
                    {item.description ? <Text style={styles.cafeDescription}>{item.description}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.heartButton} activeOpacity={0.7}>
                    <IconSymbol
                      name={isFav ? 'heart.fill' : 'heart'}
                      size={24}
                      color={isFav ? '#7d5236' : '#c4a882'}
                    />
                  </TouchableOpacity>
                </View>
              )
            }}
          />
        )}
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 20 },
  header: { backgroundColor: '#fbf1e6', borderRadius: 24, padding: 20, marginBottom: 18, shadowColor: '#8b5e34', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '700', color: '#4b3723', flex: 1, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#7d5a44', textAlign: 'center' },
  emptyCard: { backgroundColor: '#fff7ef', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#8b5e34', shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#4b3723', marginBottom: 6 },
  emptyText: { fontSize: 15, color: '#7a5f4d', textAlign: 'center' },
  list: { paddingTop: 4 },
  cafeCard: { backgroundColor: '#fff8f2', borderRadius: 20, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#8b5e34', shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  logo: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#f3e8dc', marginRight: 14, flexShrink: 0 },
  cafeInfo: { flex: 1 },
  cafeName: { fontSize: 17, fontWeight: '700', color: '#4f3421', marginBottom: 2 },
  cafeLocation: { fontSize: 12, color: '#9b7a5e', marginBottom: 4 },
  cafeDescription: { fontSize: 13, color: '#7a5f4d', lineHeight: 18 },
  heartButton: { paddingLeft: 12, paddingVertical: 4 },
})
