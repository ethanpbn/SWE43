import { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ExpoLocation from 'expo-location'

const CHECKIN_DURATION_MS = 2 * 60 * 60 * 1000 // 2 hours

type LocationContextType = {
  showLocation: boolean
  checkinExpiresAt: number | null
  toggleLocation: () => Promise<void>
  clearCheckin: () => Promise<void>
}

const LocationContext = createContext<LocationContextType>(null!)

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [showLocation, setShowLocation] = useState(false)
  const [checkinExpiresAt, setCheckinExpiresAt] = useState<number | null>(null)

  // Restore state on mount; drop it silently if it already expired while the app was closed
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('showLocation'),
      AsyncStorage.getItem('checkinExpiresAt'),
    ]).then(([show, expires]) => {
      const expiresAt = expires ? parseInt(expires, 10) : null
      if (show === 'true' && expiresAt && expiresAt > Date.now()) {
        setShowLocation(true)
        setCheckinExpiresAt(expiresAt)
      } else if (show === 'true') {
        AsyncStorage.multiRemove(['showLocation', 'checkinExpiresAt'])
      }
    })
  }, [])

  const clearCheckin = async () => {
    setShowLocation(false)
    setCheckinExpiresAt(null)
    await AsyncStorage.multiRemove(['showLocation', 'checkinExpiresAt'])
  }

  const toggleLocation = async () => {
    if (!showLocation) {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const expiresAt = Date.now() + CHECKIN_DURATION_MS
      setShowLocation(true)
      setCheckinExpiresAt(expiresAt)
      await AsyncStorage.multiSet([
        ['showLocation', 'true'],
        ['checkinExpiresAt', String(expiresAt)],
      ])
    } else {
      await clearCheckin()
    }
  }

  return (
    <LocationContext.Provider value={{ showLocation, checkinExpiresAt, toggleLocation, clearCheckin }}>
      {children}
    </LocationContext.Provider>
  )
}

export const useLocation = () => useContext(LocationContext)
