import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { useAuth } from '@/context/auth'
import { ThemedView } from '@/components/themed-view'

export default function HomeScreen() {
  const [cafes, setCafes] = useState<{ id: number; name: string }[]>([])
  const { email } = useAuth()

  useEffect(() => {
    fetch('http://localhost:3000/api/cafes')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCafes(data) })
      .catch(() => {})
  }, [])

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Cafes Near You</Text>
            <Text style={styles.subtitle}>Discover your next favorite spot.</Text>
            {email ? <Text style={styles.emailText}>{email}</Text> : null}
          </View>
        </View>

        {cafes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No cafes yet</Text>
            <Text style={styles.emptyText}>Try refreshing or check back later.</Text>
          </View>
        ) : (
          <FlatList
            data={cafes}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.cafeCard}>
                <Text style={styles.cafe}>{item.name}</Text>
              </View>
            )}
          />
        )}
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 20 },
  header: { backgroundColor: '#fbf1e6', borderRadius: 24, padding: 20, marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#8b5e34', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  title: { fontSize: 26, fontWeight: '700', color: '#4b3723', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#7d5a44', marginBottom: 10 },
  emailText: { fontSize: 13, color: '#8e725f' },
  emptyCard: { backgroundColor: '#fff7ef', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#8b5e34', shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#4b3723', marginBottom: 6 },
  emptyText: { fontSize: 15, color: '#7a5f4d', textAlign: 'center' },
  list: { paddingTop: 4 },
  cafeCard: { backgroundColor: '#fff8f2', borderRadius: 20, paddingVertical: 18, paddingHorizontal: 20, marginBottom: 14, shadowColor: '#8b5e34', shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  cafe: { fontSize: 18, fontWeight: '600', color: '#4f3421' },
})
