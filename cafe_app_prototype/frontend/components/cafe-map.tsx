import MapView, { PROVIDER_DEFAULT } from 'react-native-maps'
import { StyleSheet } from 'react-native'
import { useLocation } from '@/context/location'
type Props = { onSelectCafe?: (cafe: { id: string; name: string; rating: number; street?: string; city: string; hours?: string; cuisine?: string } | null) => void; mockLocations?: { lat: number; lng: number }[] }

export default function CafeMap({ onSelectCafe: _onSelectCafe }: Props) {
  const { showLocation } = useLocation()

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
      showsUserLocation={showLocation}
      followsUserLocation={false}
    />
  )
}

const styles = StyleSheet.create({
  map: { width: '100%', height: 400, borderRadius: 12 },
})
