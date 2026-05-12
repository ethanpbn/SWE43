import { StyleSheet, View } from 'react-native'
import { ThemedText } from '@/components/themed-text'
import CafeMap from '@/components/cafe-map'

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <CafeMap />
      <View style={styles.overlay}>
        <ThemedText type="title" style={styles.title}>Explore</ThemedText>
        <ThemedText style={styles.subtitle}>Find cafes near you</ThemedText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 60,
    left: 20,
  },
  title: { color: '#000', textShadowColor: 'rgba(255,255,255,0.8)', textShadowRadius: 4 },
  subtitle: { color: '#333' },
})
