import { useEffect } from 'react'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'

import { useColorScheme } from '@/hooks/use-color-scheme'
import { AuthProvider, useAuth } from '@/context/auth'

export const unstable_settings = {
  anchor: '(tabs)',
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
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthGuard />
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  )
}
