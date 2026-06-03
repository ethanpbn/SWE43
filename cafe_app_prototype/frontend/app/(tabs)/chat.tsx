import { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, TextInput } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ThemedView } from '@/components/themed-view'
import { IconSymbol } from '@/components/ui/icon-symbol'
import { useAuth } from '@/context/auth'
import { useLocation } from '@/context/location'
import { useLanguage } from '@/context/language'
import { convKey, type Message } from '../conversation'

const API = 'http://localhost:3000'

type NearbyUser = { email: string; lat: number; lng: number }

function nameFromEmail(email: string): string {
  return email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function initialsFromEmail(email: string): string {
  const parts = email.split('@')[0].replace(/[._]/g, ' ').split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = ['#7d5236', '#5b7d52', '#52657d', '#7d526b', '#7d7052']
function avatarColor(email: string): string {
  let hash = 0
  for (const c of email) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function fmtTimestamp(ts: number, nowLabel: string): string {
  const now = Date.now()
  const diff = now - ts
  if (diff < 60_000) return nowLabel
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86400_000) return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

type RowProps = {
  user: NearbyUser
  blocked: boolean
  preview: string
  timestamp: number | null
  nowLabel: string
  blockedLabel: string
  youHaveBlocked: string
  onToggleBlock: (email: string) => void
  onPress: () => void
}

function ConversationRow({ user, blocked, preview, timestamp, nowLabel, blockedLabel, youHaveBlocked, onToggleBlock, onPress }: RowProps) {
  const name = nameFromEmail(user.email)
  const initials = initialsFromEmail(user.email)
  const bg = blocked ? '#c4a882' : avatarColor(user.email)

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={blocked ? undefined : onPress}>
      <View style={[styles.avatar, { backgroundColor: bg }]}>
        <Text style={styles.initials}>{initials}</Text>
      </View>

      <View style={styles.textBlock}>
        <Text style={[styles.name, blocked && styles.nameBlocked]} numberOfLines={1}>{name}</Text>
        <Text style={styles.preview} numberOfLines={1}>
          {blocked ? youHaveBlocked : preview}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.blockBtn, blocked && styles.blockBtnActive]}
        onPress={() => onToggleBlock(user.email)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <IconSymbol name="nosign" size={26} color={blocked ? '#fff' : '#c4a882'} />
      </TouchableOpacity>

      <View style={styles.rightCol}>
        <Text style={styles.timestamp}>
          {blocked ? blockedLabel : (timestamp ? fmtTimestamp(timestamp, nowLabel) : nowLabel)}
        </Text>
        {!blocked && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  )
}

export default function MessagesScreen() {
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([])
  const [blocked, setBlocked] = useState<Set<string>>(new Set())
  const [previews, setPreviews] = useState<Record<string, { text: string; ts: number }>>({})
  const [query, setQuery] = useState('')
  const { showLocation } = useLocation()
  const { email, token } = useAuth()
  const router = useRouter()
  const { t } = useLanguage()

  const loadUsers = useCallback(() => {
    if (!token) return
    fetch(`${API}/api/friends`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setNearbyUsers(data.map((f: any) => ({ email: f.email, lat: 0, lng: 0 }))) })
      .catch(() => {})
  }, [token])

  useEffect(() => { loadUsers() }, [loadUsers])
  useFocusEffect(useCallback(() => { loadUsers() }, [loadUsers]))

  const loadBlocked = useCallback(() => {
    if (!email) return
    AsyncStorage.getItem(`blocked_${email}`).then(v => {
      setBlocked(v ? new Set(JSON.parse(v)) : new Set())
    })
  }, [email])

  useEffect(() => { loadBlocked() }, [loadBlocked])
  useFocusEffect(useCallback(() => { loadBlocked() }, [loadBlocked]))

  const loadPreviews = useCallback(async () => {
    if (!email || !nearbyUsers.length) return
    const result: Record<string, { text: string; ts: number }> = {}
    await Promise.all(nearbyUsers.map(async u => {
      const v = await AsyncStorage.getItem(convKey(email, u.email))
      if (v) {
        const msgs: Message[] = JSON.parse(v)
        const last = msgs[msgs.length - 1]
        if (last) result[u.email] = { text: (last.fromMe ? 'You: ' : '') + last.text, ts: last.timestamp }
      }
    }))
    setPreviews(result)
  }, [email, nearbyUsers])

  useEffect(() => { loadPreviews() }, [loadPreviews])
  useFocusEffect(useCallback(() => { loadPreviews() }, [loadPreviews]))

  const toggleBlock = useCallback((target: string) => {
    setBlocked(prev => {
      const next = new Set(prev)
      const wasBlocked = next.has(target)
      wasBlocked ? next.delete(target) : next.add(target)
      if (email) AsyncStorage.setItem(`blocked_${email}`, JSON.stringify([...next]))
      if (token) {
        fetch(`${API}/api/blocks/${encodeURIComponent(target)}`, {
          method: wasBlocked ? 'DELETE' : 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }
      return next
    })
  }, [email, token])

  const filtered = query.trim()
    ? nearbyUsers.filter(u =>
        nameFromEmail(u.email).toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())
      )
    : nearbyUsers

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.messages}</Text>
        <TouchableOpacity style={styles.composeBtn} activeOpacity={0.7}>
          <IconSymbol name="square.and.pencil" size={22} color="#7d5236" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <IconSymbol name="magnifyingglass" size={15} color="#9b7a5e" />
        <TextInput
          style={styles.searchInput}
          placeholder={t.search}
          placeholderTextColor="#9b7a5e"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <IconSymbol name="bubble.left.and.bubble.right.fill" size={52} color="#d4bfa8" />
          <Text style={styles.emptyTitle}>{query.trim() ? t.noResults : t.noMessages}</Text>
          <Text style={styles.emptyText}>
            {query.trim()
              ? `${t.noResultsMatch} "${query.trim()}".`
              : 'Add friends from the Home tab to start messaging.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={u => u.email}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          renderItem={({ item }) => (
            <ConversationRow
              user={item}
              blocked={blocked.has(item.email)}
              preview={previews[item.email]?.text ?? t.noMessagesSent}
              timestamp={previews[item.email]?.ts ?? null}
              nowLabel={t.nowLabel}
              blockedLabel={t.blockedLabel}
              youHaveBlocked={t.youHaveBlocked}
              onToggleBlock={toggleBlock}
              onPress={() => router.push({ pathname: '/conversation', params: { userEmail: item.email } } as any)}
            />
          )}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf5' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 10,
  },
  title: { fontSize: 34, fontWeight: '800', color: '#4b3723', letterSpacing: -0.5 },
  composeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0e4d4',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, alignSelf: 'stretch', fontSize: 15, color: '#4b3723', borderWidth: 0, borderColor: 'transparent', backgroundColor: '#f0e4d4', outline: 'none', outlineStyle: 'none', outlineWidth: 0 } as any,
  list: { paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, backgroundColor: '#fffaf5' },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 },
  initials: { fontSize: 20, fontWeight: '700', color: '#fff' },
  textBlock: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#1c1c1e', marginBottom: 3 },
  nameBlocked: { color: '#9b7a5e' },
  preview: { fontSize: 14, color: '#8e8e93' },
  rightCol: { width: 58, alignItems: 'flex-end', justifyContent: 'space-between', marginLeft: 8, gap: 6 },
  timestamp: { fontSize: 13, color: '#9b7a5e' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7d5236' },
  blockBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginLeft: 8, backgroundColor: 'transparent' },
  blockBtnActive: { backgroundColor: '#c0392b' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e8d9cc', marginLeft: 84 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#4b3723' },
  emptyText: { fontSize: 15, color: '#7a5f4d', textAlign: 'center', lineHeight: 22 },
})
