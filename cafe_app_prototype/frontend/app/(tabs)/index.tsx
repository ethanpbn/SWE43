import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/context/auth'

export default function HomeScreen() {
  const [cafes, setCafes] = useState<{ id: number; name: string }[]>([])
  const { logout, email } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetch('http://localhost:3000/api/cafes')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCafes(data) })
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cafes Near You</Text>
          {email ? <Text style={styles.emailText}>{email}</Text> : null}
        </View>
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {cafes.length === 0 ? (
        <Text style={styles.empty}>No cafes yet — add some!</Text>
      ) : (
        <FlatList
          data={cafes}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <Text style={styles.cafe}>{item.name}</Text>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  emailText: { fontSize: 13, color: '#999', marginTop: 2 },
  signOutButton: { backgroundColor: '#f5f5f5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e0e0e0' },
  signOutText: { fontSize: 14, fontWeight: '600', color: '#e74c3c' },
  empty: { color: 'gray', fontSize: 16 },
  cafe: { fontSize: 18, padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
})
