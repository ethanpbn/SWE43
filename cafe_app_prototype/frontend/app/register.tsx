import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/context/auth'

export default function RegisterScreen() {
  const { register } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setError('')
    if (password !== confirm) return setError('Passwords do not match')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    try {
      await register(email.trim(), password)
      router.replace('/(tabs)')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.logo}>☕</Text>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join to discover cafes near you</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor="#999"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Sign in</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, padding: 32, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', color: '#1a1a1a' },
  subtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 28, marginTop: 4 },
  error: { color: '#e74c3c', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 14, color: '#1a1a1a', backgroundColor: '#fafafa' },
  button: { backgroundColor: '#e74c3c', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 4, marginBottom: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', color: '#888', fontSize: 14 },
  linkBold: { color: '#e74c3c', fontWeight: '600' },
})
