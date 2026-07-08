import { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ThemedView } from '@/components/themed-view'
import { IconSymbol } from '@/components/ui/icon-symbol'
import { useAuth } from '@/context/auth'
import { useLanguage } from '@/context/language'

import API from '@/constants/api'

function nameFromEmail(email: string): string {
  const local = email.split('@')[0]
  return local.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function initialsFromEmail(email: string): string {
  const parts = email.split('@')[0].replace(/[._]/g, ' ').split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

export default function BlockedScreen() {
  const [blockedEmails, setBlockedEmails] = useState<string[]>([])
  const { email, token } = useAuth()
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    if (!email) return
    AsyncStorage.getItem(`blocked_${email}`).then(v => {
      setBlockedEmails(v ? JSON.parse(v) : [])
    })
  }, [email])

  const unblock = useCallback(async (target: string) => {
    const next = blockedEmails.filter(e => e !== target)
    setBlockedEmails(next)
    if (email) await AsyncStorage.setItem(`blocked_${email}`, JSON.stringify(next))
    if (token) {
      fetch(`${API}/api/blocks/${encodeURIComponent(target)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
  }, [blockedEmails, email, token])

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <IconSymbol name="chevron.left" size={22} color="#7d5236" />
          </TouchableOpacity>
          <Text style={styles.title}>{t.blockedUsers}</Text>
          <View style={{ width: 22 }} />
        </View>
      </View>

      {blockedEmails.length === 0 ? (
        <View style={styles.emptyCard}>
          <IconSymbol name="nosign" size={40} color="#c4a882" />
          <Text style={styles.emptyTitle}>{t.noBlockedUsers}</Text>
          <Text style={styles.emptyText}>{t.usersBlockAppear}</Text>
        </View>
      ) : (
        <FlatList
          data={blockedEmails}
          keyExtractor={e => e}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.initials}>{initialsFromEmail(item)}</Text>
              </View>
              <View style={styles.textBlock}>
                <Text style={styles.name} numberOfLines={1}>{nameFromEmail(item)}</Text>
                <Text style={styles.emailText} numberOfLines={1}>{item}</Text>
              </View>
              <TouchableOpacity
                style={styles.unblockBtn}
                onPress={() => unblock(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.unblockText}>{t.unblock}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: '#fbf1e6', borderRadius: 24, margin: 20, marginBottom: 12, padding: 20, shadowColor: '#8b5e34', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '700', color: '#4b3723', flex: 1, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#c0392b', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 },
  initials: { fontSize: 17, fontWeight: '700', color: '#fff' },
  textBlock: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#4b3723', marginBottom: 2 },
  emailText: { fontSize: 12, color: '#9b7a5e' },
  unblockBtn: { backgroundColor: '#fff8f2', borderWidth: 1.5, borderColor: '#7d5236', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  unblockText: { fontSize: 13, fontWeight: '700', color: '#7d5236' },
  divider: { height: 1, backgroundColor: '#f0e4d4', marginLeft: 62 },
  emptyCard: { margin: 20, backgroundColor: '#fff7ef', borderRadius: 20, padding: 32, alignItems: 'center', gap: 10, shadowColor: '#8b5e34', shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#4b3723' },
  emptyText: { fontSize: 14, color: '#7a5f4d', textAlign: 'center' },
})
