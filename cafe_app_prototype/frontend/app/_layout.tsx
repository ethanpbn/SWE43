import { useEffect } from 'react'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'

import { useColorScheme } from '@/hooks/use-color-scheme'
import { AuthProvider, useAuth } from '@/context/auth'
import { LocationProvider, useLocation } from '@/context/location'
import { LanguageProvider } from '@/context/language'

export const unstable_settings = {
  anchor: '(tabs)',
}

function CheckinGuard() {
  const { checkinExpiresAt, clearCheckin } = useLocation()

  useEffect(() => {
    if (!checkinExpiresAt) return
    const delay = checkinExpiresAt - Date.now()
    if (delay <= 0) { clearCheckin(); return }
    const id = setTimeout(() => clearCheckin(), delay)
    return () => clearTimeout(id)
  }, [checkinExpiresAt])

  return null
}

function AuthGuard() {
  const { token, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const onAuthScreen = segments[0] === 'login' || segments[0] === 'register'
    if (!token && !onAuthScreen) {
      router.replace('/login')
    } else if (token && onAuthScreen) {
      router.replace('/(tabs)')
    }
  }, [token, loading, segments])

  return null
}

export default function RootLayout() {
  const colorScheme = useColorScheme()

  return (
    <AuthProvider>
      <LanguageProvider>
      <LocationProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthGuard />
        <CheckinGuard />
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="favorites" options={{ headerShown: false }} />
          <Stack.Screen name="blocked" options={{ headerShown: false }} />
          <Stack.Screen name="conversation" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
      </LocationProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}
