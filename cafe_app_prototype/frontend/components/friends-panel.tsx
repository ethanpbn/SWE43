import { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useAuth } from '@/context/auth'
import { useColorScheme } from '@/hooks/use-color-scheme'

const API = 'http://localhost:3000'

type Friend = { id: number; email: string }

export default function FriendsPanel() {
  const { token } = useAuth()
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<Friend[]>([])
  const [adding, setAdding] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const headers = { Authorization: `Bearer ${token}` }

  const load = useCallback(() => {
    if (!token) return
    fetch(`${API}/api/friends`, { headers })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setFriends(d) }).catch(() => {})
    fetch(`${API}/api/friends/requests`, { headers })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setRequests(d) }).catch(() => {})
  }, [token])

  useEffect(() => { load() }, [load])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const sendRequest = async () => {
    setError('')
    setSent(false)
    if (!emailInput.trim()) return
    const res = await fetch(`${API}/api/friends/request`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput.trim() }),
    }).catch(() => null)
    const data = await res?.json()
    if (!res?.ok) { setError(data?.error || 'Not found'); return }
    setSent(true)
    setEmailInput('')
    setTimeout(() => { setSent(false); setAdding(false) }, 1500)
    load()
  }

  const accept = async (id: number) => {
    await fetch(`${API}/api/friends/accept/${id}`, { method: 'PUT', headers }).catch(() => {})
    load()
  }

  const remove = async (id: number) => {
    await fetch(`${API}/api/friends/${id}`, { method: 'DELETE', headers }).catch(() => {})
    load()
  }

  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const bg        = isDark ? '#1e1208' : '#fbf1e6'
  const rowBg     = isDark ? '#2a1a0a' : '#fff8f2'
  const inputBg   = isDark ? '#2a1a0a' : '#f5e6d3'
  const addBoxBg  = isDark ? '#150e05' : '#fff8f2'
  const titleClr  = isDark ? '#f0ddc8' : '#4b3723'
  const nameClr   = isDark ? '#e8d0b8' : '#4b3723'
  const subClr    = isDark ? '#7d6050' : '#9b7a5e'
  const accentClr = isDark ? '#c8973a' : '#7d5236'
  const emptyClr  = isDark ? '#6a5040' : '#9b7a5e'
  const labelClr  = isDark ? '#6a5040' : '#9b7a5e'
  const borderClr = isDark ? '#2e1e0e' : '#d4b896'

  const nameFor = (email: string) => email.split('@')[0]

  return (
    <View style={[styles.panel, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: titleClr }]}>Friends</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: accentClr }]} onPress={() => { setAdding(a => !a); setError(''); setEmailInput(''); setSent(false) }}>
          <Text style={styles.addBtnText}>{adding ? '✕' : '+'}</Text>
        </TouchableOpacity>
      </View>

      {adding && (
        <View style={[styles.addBox, { backgroundColor: addBoxBg }]}>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: nameClr }]}
            placeholder="Friend's email"
            placeholderTextColor={subClr}
            value={emailInput}
            onChangeText={setEmailInput}
            autoCapitalize="none"
            keyboardType="email-address"
            onSubmitEditing={sendRequest}
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: accentClr }]} onPress={sendRequest}>
            <Text style={styles.sendBtnText}>{sent ? '✓' : 'Add'}</Text>
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {requests.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: labelClr }]}>Requests</Text>
            {requests.map(r => (
              <View key={r.id} style={[styles.row, { backgroundColor: rowBg }]}>
                <View style={[styles.avatar, { backgroundColor: inputBg }]}>
                  <Text style={[styles.avatarLetter, { color: accentClr }]}>{nameFor(r.email)[0].toUpperCase()}</Text>
                </View>
                <Text style={[styles.name, { color: nameClr }]} numberOfLines={1}>{nameFor(r.email)}</Text>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => accept(r.id)}>
                  <Text style={styles.acceptText}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(r.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.rejectText, { color: borderClr }]}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          {friends.length === 0 ? (
            <Text style={[styles.empty, { color: emptyClr }]}>No friends yet{'\n'}Tap + to add one</Text>
          ) : friends.map(f => (
            <View key={f.id} style={[styles.row, { backgroundColor: rowBg }]}>
              <View style={[styles.avatar, { backgroundColor: inputBg }]}>
                <Text style={[styles.avatarLetter, { color: accentClr }]}>{nameFor(f.email)[0].toUpperCase()}</Text>
              </View>
              <Text style={[styles.name, { color: nameClr }]} numberOfLines={1}>{nameFor(f.email)}</Text>
              <TouchableOpacity onPress={() => remove(f.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.rejectText, { color: borderClr }]}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { flex: 1, borderRadius: 24, padding: 14, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  addBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 18, color: '#fff', fontWeight: '700', lineHeight: 22 },
  addBox: { borderRadius: 14, padding: 10, marginBottom: 12, gap: 6 },
  input: { borderRadius: 10, padding: 8, fontSize: 13 },
  sendBtn: { borderRadius: 10, padding: 8, alignItems: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  error: { fontSize: 12, color: '#e74c3c', textAlign: 'center' },
  section: { marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 8, marginBottom: 6 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0 },
  avatarLetter: { fontSize: 14, fontWeight: '700' },
  name: { flex: 1, fontSize: 13, fontWeight: '600' },
  acceptBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#27ae60', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  acceptText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  rejectText: { fontSize: 14, fontWeight: '600' },
  empty: { fontSize: 13, textAlign: 'center', marginTop: 16, lineHeight: 20 },
})
