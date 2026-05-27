import { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ExpoLocation from 'expo-location'

type LocationContextType = {
  showLocation: boolean
  toggleLocation: () => Promise<void>
}

const LocationContext = createContext<LocationContextType>(null!)

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [showLocation, setShowLocation] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem('showLocation').then(v => {
      if (v === 'true') setShowLocation(true)
    })
  }, [])

  const toggleLocation = async () => {
    if (!showLocation) {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
    }
    const next = !showLocation
    setShowLocation(next)
    await AsyncStorage.setItem('showLocation', next ? 'true' : 'false')
  }

  return (
    <LocationContext.Provider value={{ showLocation, toggleLocation }}>
      {children}
    </LocationContext.Provider>
  )
}

export const useLocation = () => useContext(LocationContext)
