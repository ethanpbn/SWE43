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

  // Restore state on mount — location preference persists indefinitely,
  // check-in timer is dropped if it expired while the app was closed
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('showLocation'),
      AsyncStorage.getItem('checkinExpiresAt'),
    ]).then(([show, expires]) => {
      if (show === 'true') {
        setShowLocation(true)
        const expiresAt = expires ? parseInt(expires, 10) : null
        if (expiresAt && expiresAt > Date.now()) {
          setCheckinExpiresAt(expiresAt)
        } else {
          AsyncStorage.removeItem('checkinExpiresAt')
        }
      }
    })
  }, [])

  const clearCheckin = async () => {
    setCheckinExpiresAt(null)
    await AsyncStorage.removeItem('checkinExpiresAt')
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
      setShowLocation(false)
      setCheckinExpiresAt(null)
      await AsyncStorage.multiRemove(['showLocation', 'checkinExpiresAt'])
    }
  }

  return (
    <LocationContext.Provider value={{ showLocation, checkinExpiresAt, toggleLocation, clearCheckin }}>
      {children}
    </LocationContext.Provider>
  )
}

export const useLocation = () => useContext(LocationContext)
