import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'

export default function HomeScreen() {
  const [cafes, setCafes] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    fetch('http://localhost:3000/api/cafes')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCafes(data) })
      .catch(() => {})
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cafes Near You</Text>
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
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  empty: { color: 'gray', fontSize: 16 },
  cafe: { fontSize: 18, padding: 10, borderBottomWidth: 1, borderColor: '#eee' }
})