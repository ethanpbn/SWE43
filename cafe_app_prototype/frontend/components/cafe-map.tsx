import MapView, { PROVIDER_DEFAULT } from 'react-native-maps'
import { StyleSheet } from 'react-native'

export default function CafeMap() {
  return (
    <MapView
      provider={PROVIDER_DEFAULT}
      style={styles.map}
      initialRegion={{
        latitude: 33.6846,
        longitude: -117.8265,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
    />
  )
}

const styles = StyleSheet.create({
  map: { width: '100%', height: 400, borderRadius: 12 },
})
