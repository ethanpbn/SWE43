import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/context/auth'
import { IconSymbol } from '@/components/ui/icon-symbol'
import { useLanguage } from '@/context/language'

export type Message = { id: string; text: string; fromMe: boolean; timestamp: number }

export function convKey(a: string, b: string) {
  return `conv_${[a, b].sort().join('__')}`
}

const REPLIES = [
  "Hey! How's it going?",
  "Sounds good to me!",
  "I'm at a café nearby ☕",
  "What are you up to?",
  "Nice to hear from you!",
  "Let's grab coffee sometime!",
  "Sure thing!",
  "Haha yeah for sure!",
  "That's awesome!",
  "I'll be there in a bit!",
]

function nameFromEmail(email: string): string {
  return email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function initialsFromEmail(email: string): string {
  const parts = email.split('@')[0].replace(/[._]/g, ' ').split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function ConversationScreen() {
  const { userEmail } = useLocalSearchParams<{ userEmail: string }>()
  const { email: myEmail } = useAuth()
  const router = useRouter()
  const { t } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const key = myEmail && userEmail ? convKey(myEmail, userEmail) : null

  useEffect(() => {
    if (!key) return
    AsyncStorage.getItem(key).then(v => {
      if (v) setMessages(JSON.parse(v))
    })
  }, [key])

  const persist = useCallback((msgs: Message[]) => {
    if (key) AsyncStorage.setItem(key, JSON.stringify(msgs))
  }, [key])

  const send = useCallback(() => {
    const text = input.trim()
    if (!text || !key) return
    const msg: Message = { id: Date.now().toString(), text, fromMe: true, timestamp: Date.now() }
    setMessages(prev => { const next = [...prev, msg]; persist(next); return next })
    setInput('')

    // Simulated reply
    const delay = 900 + Math.random() * 1400
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        text: REPLIES[Math.floor(Math.random() * REPLIES.length)],
        fromMe: false,
        timestamp: Date.now(),
      }
      setMessages(prev => { const next = [...prev, reply]; persist(next); return next })
    }, delay)
  }, [input, key, persist])

  const name = userEmail ? nameFromEmail(userEmail) : 'Chat'
  const initials = userEmail ? initialsFromEmail(userEmail) : '?'

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <IconSymbol name="chevron.left" size={22} color="#7d5236" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerInitials}>{initials}</Text>
            </View>
            <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Message list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>{t.sayHello.replace('{name}', name)}</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const prev = messages[index - 1]
            const next = messages[index + 1]
            const showTime = !next || next.fromMe !== item.fromMe ||
              next.timestamp - item.timestamp > 60_000
            const isFirst = !prev || prev.fromMe !== item.fromMe
            return (
              <View>
                {isFirst && !item.fromMe && (
                  <Text style={styles.senderLabel}>{name}</Text>
                )}
                <View style={[styles.bubbleRow, item.fromMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
                  <View style={[
                    styles.bubble,
                    item.fromMe ? styles.bubbleMe : styles.bubbleThem,
                    isFirst && !item.fromMe && styles.bubbleThemFirst,
                    isFirst && item.fromMe && styles.bubbleMeFirst,
                  ]}>
                    <Text style={[styles.bubbleText, item.fromMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                      {item.text}
                    </Text>
                  </View>
                </View>
                {showTime && (
                  <Text style={[styles.timeLabel, item.fromMe ? styles.timeLabelMe : styles.timeLabelThem]}>
                    {fmtTime(item.timestamp)}
                  </Text>
                )}
              </View>
            )
          }}
          ListFooterComponent={typing ? (
            <View style={styles.bubbleRow}>
              <View style={[styles.bubble, styles.bubbleThem, styles.typingBubble]}>
                <Text style={styles.typingDots}>• • •</Text>
              </View>
            </View>
          ) : null}
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={t.messagePlaceholder}
            placeholderTextColor="#9b7a5e"
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            onSubmitEditing={send}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnOff]}
            onPress={send}
            disabled={!input.trim()}
            activeOpacity={0.8}
          >
            <IconSymbol name="paperplane.fill" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fffaf5' },
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8d9cc',
    backgroundColor: '#fffaf5',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  headerAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#7d5236', alignItems: 'center', justifyContent: 'center' },
  headerInitials: { fontSize: 13, fontWeight: '700', color: '#fff' },
  headerName: { fontSize: 17, fontWeight: '700', color: '#4b3723', flexShrink: 1 },
  headerSpacer: { width: 36 },

  msgList: { paddingHorizontal: 12, paddingVertical: 16, flexGrow: 1 },

  senderLabel: { fontSize: 12, color: '#9b7a5e', marginLeft: 14, marginBottom: 2, marginTop: 8 },
  bubbleRow: { flexDirection: 'row', marginBottom: 2 },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '72%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  bubbleMe: { backgroundColor: '#7d5236', borderBottomRightRadius: 4 },
  bubbleMeFirst: { borderTopRightRadius: 20 },
  bubbleThem: { backgroundColor: '#f0e4d4', borderBottomLeftRadius: 4 },
  bubbleThemFirst: { borderTopLeftRadius: 20 },

  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: '#fff' },
  bubbleTextThem: { color: '#4b3723' },

  timeLabel: { fontSize: 11, color: '#9b7a5e', marginBottom: 6, marginTop: 2 },
  timeLabelMe: { textAlign: 'right', marginRight: 6 },
  timeLabelThem: { textAlign: 'left', marginLeft: 6 },

  typingBubble: { paddingVertical: 11 },
  typingDots: { fontSize: 16, color: '#9b7a5e', letterSpacing: 2 },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyChatText: { fontSize: 15, color: '#9b7a5e' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e8d9cc',
    backgroundColor: '#fffaf5',
  },
  input: {
    flex: 1,
    height: 38,
    backgroundColor: '#f0e4d4',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 0,
    fontSize: 15,
    color: '#4b3723',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7d5236',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: '#c4a882' },
})
