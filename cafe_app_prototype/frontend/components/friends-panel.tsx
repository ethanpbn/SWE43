import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native'
import { useFocusEffect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/context/auth'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { convKey, type Message } from '@/app/conversation'
import { IconSymbol } from '@/components/ui/icon-symbol'

const REPLIES = [
  "Hey! How's it going?", "Sounds good!", "I'm at a café nearby ☕",
  "What are you up to?", "Let's grab coffee sometime!", "Sure thing!",
  "Haha yeah for sure!", "That's awesome!", "I'll be there in a bit!",
]

import API from '@/constants/api'

type Friend = { id: number; email: string }

export default function FriendsPanel() {
  const { token, email: myEmail } = useAuth()
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<Friend[]>([])
  const [adding, setAdding] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [chatFriend, setChatFriend] = useState<Friend | null>(null)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const scrollRef = useRef<ScrollView>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [msgNotifs, setMsgNotifs] = useState<{ email: string; preview: string; timestamp: number }[]>([])

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

  const loadMsgNotifs = useCallback(async () => {
    if (!myEmail || !friends.length) return
    const notifs: { email: string; preview: string; timestamp: number }[] = []
    for (const f of friends) {
      const key = convKey(myEmail, f.email)
      const lastReadKey = `lastRead_${key}`
      const [raw, lastReadRaw] = await Promise.all([
        AsyncStorage.getItem(key),
        AsyncStorage.getItem(lastReadKey),
      ])
      if (!raw) continue
      const msgs: Message[] = JSON.parse(raw)
      const lastRead = lastReadRaw ? parseInt(lastReadRaw) : 0
      const unread = msgs.filter(m => !m.fromMe && m.timestamp > lastRead)
      if (unread.length > 0) {
        const last = unread[unread.length - 1]
        notifs.push({ email: f.email, preview: last.text, timestamp: last.timestamp })
      }
    }
    setMsgNotifs(notifs)
  }, [myEmail, friends])

  useEffect(() => { loadMsgNotifs() }, [loadMsgNotifs])
  useFocusEffect(useCallback(() => { loadMsgNotifs() }, [loadMsgNotifs]))

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
    setOpenMenu(null)
    load()
  }

  const block = async (friendEmail: string, id: number) => {
    await fetch(`${API}/api/blocks/${encodeURIComponent(friendEmail)}`, { method: 'POST', headers }).catch(() => {})
    await remove(id)
  }

  const openChat = (friend: Friend) => {
    setOpenMenu(null)
    setChatFriend(friend)
    if (!myEmail) return
    const key = convKey(myEmail, friend.email)
    AsyncStorage.getItem(key).then(v => {
      setChatMessages(v ? JSON.parse(v) : [])
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100)
    })
    AsyncStorage.setItem(`lastRead_${key}`, Date.now().toString())
    setMsgNotifs(prev => prev.filter(n => n.email !== friend.email))
  }

  const sendChat = () => {
    if (!chatInput.trim() || !chatFriend || !myEmail) return
    const key = convKey(myEmail, chatFriend.email)
    const msg: Message = { id: Date.now().toString(), text: chatInput.trim(), fromMe: true, timestamp: Date.now() }
    const next = [...chatMessages, msg]
    setChatMessages(next)
    AsyncStorage.setItem(key, JSON.stringify(next))
    setChatInput('')
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)

    setTimeout(() => {
      const reply: Message = { id: (Date.now() + 1).toString(), text: REPLIES[Math.floor(Math.random() * REPLIES.length)], fromMe: false, timestamp: Date.now() }
      const withReply = [...next, reply]
      setChatMessages(withReply)
      AsyncStorage.setItem(key, JSON.stringify(withReply))
      AsyncStorage.setItem(`lastRead_${key}`, Date.now().toString())
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    }, 1000 + Math.random() * 1400)
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
        <View style={styles.headerBtns}>
          {/* Notification bell */}
          <TouchableOpacity style={[styles.bellBtn, { backgroundColor: accentClr }]} onPress={() => setNotifOpen(o => !o)}>
            <IconSymbol name="bell.fill" size={14} color="#fff" />
            {(requests.length + msgNotifs.length) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{requests.length + msgNotifs.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: accentClr }]} onPress={() => { setAdding(a => !a); setError(''); setEmailInput(''); setSent(false) }}>
            <Text style={styles.addBtnText}>{adding ? '✕' : '+'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notification dropdown */}
      {notifOpen && (
        <View style={[styles.notifPanel, { backgroundColor: addBoxBg, borderColor: isDark ? '#3a2410' : '#e8d5c0' }]}>
          {requests.length === 0 && msgNotifs.length === 0 ? (
            <Text style={[styles.notifEmpty, { color: subClr }]}>No new notifications</Text>
          ) : null}

          {requests.map(r => (
            <View key={r.id} style={styles.notifRow}>
              <View style={[styles.notifDot, { backgroundColor: '#27ae60' }]} />
              <View style={styles.notifInfo}>
                <Text style={[styles.notifText, { color: nameClr }]}>
                  <Text style={{ fontWeight: '700' }}>{nameFor(r.email)}</Text> wants to be your friend
                </Text>
              </View>
              <TouchableOpacity style={[styles.notifAccept, { backgroundColor: accentClr }]} onPress={() => { accept(r.id); setNotifOpen(false) }}>
                <Text style={styles.notifAcceptText}>✓</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { remove(r.id); setNotifOpen(false) }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.notifReject, { color: subClr }]}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {msgNotifs.map(n => {
            const friend = friends.find(f => f.email === n.email)
            return (
              <TouchableOpacity key={n.email} style={styles.notifRow} onPress={() => { if (friend) openChat(friend); setNotifOpen(false) }}>
                <View style={[styles.notifDot, { backgroundColor: '#4285F4' }]} />
                <View style={styles.notifInfo}>
                  <Text style={[styles.notifText, { color: nameClr }]}>
                    <Text style={{ fontWeight: '700' }}>{nameFor(n.email)}</Text>: {n.preview}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

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
            <View key={f.id}>
              <View style={[styles.row, { backgroundColor: rowBg }]}>
                <View style={[styles.avatar, { backgroundColor: inputBg }]}>
                  <Text style={[styles.avatarLetter, { color: accentClr }]}>{nameFor(f.email)[0].toUpperCase()}</Text>
                </View>
                <Text style={[styles.name, { color: nameClr }]} numberOfLines={1}>{nameFor(f.email)}</Text>
                <TouchableOpacity
                  onPress={() => setOpenMenu(openMenu === f.id ? null : f.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.menuToggle}
                >
                  <View style={[styles.menuBar, { backgroundColor: accentClr }]} />
                  <View style={[styles.menuBar, { backgroundColor: accentClr }]} />
                  <View style={[styles.menuBar, { backgroundColor: accentClr }]} />
                </TouchableOpacity>
              </View>
              {openMenu === f.id && (
                <View style={[styles.dropdown, { backgroundColor: isDark ? '#1a0f06' : '#fff8f2', borderColor: isDark ? '#3a2410' : '#e8d5c0' }]}>
                  <TouchableOpacity style={styles.dropItem} onPress={() => openChat(f)}>
                    <Text style={[styles.dropText, { color: accentClr }]}>💬  Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dropItem} onPress={() => remove(f.id)}>
                    <Text style={[styles.dropText, { color: nameClr }]}>🗑  Remove</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dropItem} onPress={() => block(f.email, f.id)}>
                    <Text style={[styles.dropText, { color: '#e74c3c' }]}>🚫  Block</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Chat popup modal */}
      <Modal visible={!!chatFriend} transparent animationType="slide" onRequestClose={() => setChatFriend(null)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.chatPopup}>
            {/* Header */}
            <View style={styles.chatHeader}>
              <View style={styles.chatAvatar}>
                <Text style={styles.chatAvatarLetter}>{chatFriend ? nameFor(chatFriend.email)[0].toUpperCase() : ''}</Text>
              </View>
              <Text style={styles.chatHeaderName}>{chatFriend ? nameFor(chatFriend.email) : ''}</Text>
              <TouchableOpacity onPress={() => setChatFriend(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.chatClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.chatMessages}
              contentContainerStyle={styles.chatMessagesContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {chatMessages.length === 0 && (
                <Text style={styles.chatEmpty}>Say hello! 👋</Text>
              )}
              {chatMessages.map(msg => (
                <View key={msg.id} style={[styles.bubbleRow, msg.fromMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
                  <View style={[styles.bubble, msg.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
                    <Text style={[styles.bubbleText, msg.fromMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>{msg.text}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Input */}
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Message…"
                placeholderTextColor="#9b7a5e"
                returnKeyType="send"
                onSubmitEditing={sendChat}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[styles.chatSendBtn, !chatInput.trim() && styles.chatSendBtnOff]}
                onPress={sendChat}
                disabled={!chatInput.trim()}
              >
                <Text style={styles.chatSendArrow}>➤</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bellBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#e74c3c', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 10, color: '#fff', fontWeight: '800' },
  notifPanel: { borderRadius: 14, borderWidth: 1, padding: 10, marginBottom: 10, gap: 6 },
  notifEmpty: { fontSize: 12, textAlign: 'center', paddingVertical: 4 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  notifDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  notifInfo: { flex: 1 },
  notifText: { fontSize: 12, lineHeight: 16 },
  notifAccept: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  notifAcceptText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  notifReject: { fontSize: 14, fontWeight: '600' },
  menuToggle: { padding: 4, gap: 3, justifyContent: 'center' },
  menuBar: { width: 14, height: 2, borderRadius: 1 },
  dropdown: { borderRadius: 10, borderWidth: 1, marginBottom: 6, marginTop: -2, overflow: 'hidden' },
  dropItem: { paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  dropText: { fontSize: 13, fontWeight: '600' },

  // Chat modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', paddingBottom: 20, paddingRight: 16, backgroundColor: 'rgba(0,0,0,0.3)' },
  chatPopup: { width: 320, height: 460, backgroundColor: '#fffaf5', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e8d5c0', backgroundColor: '#fbf1e6' },
  chatAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#7d5236', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  chatAvatarLetter: { fontSize: 14, fontWeight: '700', color: '#fff' },
  chatHeaderName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#4b3723' },
  chatClose: { fontSize: 16, color: '#9b7a5e', fontWeight: '600' },
  chatMessages: { flex: 1 },
  chatMessagesContent: { padding: 12, flexGrow: 1, justifyContent: 'flex-end' },
  chatEmpty: { textAlign: 'center', color: '#9b7a5e', fontSize: 13, marginTop: 20 },
  bubbleRow: { flexDirection: 'row', marginBottom: 4 },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  bubbleMe: { backgroundColor: '#7d5236', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#f0e4d4', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTextThem: { color: '#4b3723' },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e8d5c0', gap: 8 },
  chatInput: { flex: 1, height: 36, backgroundColor: '#f0e4d4', borderRadius: 18, paddingHorizontal: 14, fontSize: 14, color: '#4b3723' },
  chatSendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7d5236', alignItems: 'center', justifyContent: 'center' },
  chatSendBtnOff: { backgroundColor: '#c4a882' },
  chatSendArrow: { fontSize: 14, color: '#fff' },
})
