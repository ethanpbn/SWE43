import { StyleSheet, View } from 'react-native'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import CafeMap from '@/components/cafe-map'

export default function ExploreScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Explore</ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>Find cafes, see routes, and explore the map.</ThemedText>
      </View>

      <View style={styles.mapCard}>
        <CafeMap />
        <View style={styles.infoBadge}>
          <ThemedText type="defaultSemiBold" style={styles.badgeTitle}>Top picks nearby</ThemedText>
          <ThemedText style={styles.badgeSubtitle}>5 cafes in the area</ThemedText>
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
  infoBadge: { position: 'absolute', left: 18, bottom: 18, backgroundColor: 'rgba(251,241,230,0.96)', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, width: '85%' },
  badgeTitle: { fontSize: 18, color: '#4b3723', marginBottom: 4 },
  badgeSubtitle: { fontSize: 14, color: '#7a5f4d' },
})
