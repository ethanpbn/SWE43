import React, { useEffect, useState } from 'react'
import { View, StyleSheet, TouchableOpacity, Image, FlatList, useWindowDimensions, Modal, ScrollView, Text } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ImagePicker from 'expo-image-picker'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol'
import { useAuth } from '@/context/auth'
import { useLocation } from '@/context/location'
import { useLanguage, LANGUAGES } from '@/context/language'

const ITEMS: ReadonlyArray<{
  key: string
  label: string
  icon?: IconSymbolName
  isSpacer?: true
}> = [
  { key: 'favorites', label: 'Favorites', icon: 'heart.fill' },
  { key: 'history', label: 'History', icon: 'clock.fill' },
  { key: 'language', label: 'Language', icon: 'globe' },
  { key: 'location', label: 'Location', icon: 'location.fill' },
  { key: 'blocks', label: 'Blocks', icon: 'nosign' },
  { key: 'terms', label: 'Terms of Service', icon: 'doc.text.fill' },
  { key: 'spacer1', label: '', isSpacer: true },
  { key: 'logoff', label: 'Log Off', icon: 'power' },
  { key: 'spacer2', label: '', isSpacer: true },
]

export default function ProfileScreen() {
  const { width, height } = useWindowDimensions()
  const { logout, email } = useAuth()
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [showTerms, setShowTerms] = useState(false)
  const [showLang, setShowLang] = useState(false)
  const { t, lang, setLang } = useLanguage()

  useEffect(() => {
    if (!email) return
    AsyncStorage.getItem(`profilePhoto_${email}`).then(v => { if (v) setProfilePhoto(v) })
  }, [email])

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    })
    if (result.canceled || !result.assets[0]) return
    const uri = result.assets[0].base64
      ? `data:image/jpeg;base64,${result.assets[0].base64}`
      : result.assets[0].uri
    setProfilePhoto(uri)
    if (email) AsyncStorage.setItem(`profilePhoto_${email}`, uri)
  }
  const router = useRouter()
  const { showLocation, toggleLocation } = useLocation()

  const handleLogoff = () => {
    logout()
    router.replace('/login')
  }

  const labelMap: Record<string, string> = {
    favorites: t.favorites, history: t.history, language: t.language,
    location: t.location, blocks: t.blocks, terms: t.terms, logoff: t.logOff,
  }

  const avatarSize = Math.max(120, Math.min(200, Math.floor(Math.min(width, height) * 0.36)))
  const buttonSize = Math.max(64, Math.min(140, Math.floor(Math.min(width, height) * 0.18)))
  const iconSize = Math.max(20, Math.floor(buttonSize * 0.36))
  const labelFontSize = Math.max(10, Math.floor(buttonSize * 0.12) + 8)
  const gridWidth = Math.min(width * 0.75, buttonSize * 3 + 48)
  return (
    <ThemedView style={styles.container}>
      <View style={styles.topArea}>
        <TouchableOpacity style={[styles.avatarButton, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]} activeOpacity={0.9} onPress={pickPhoto}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <View style={styles.avatarDefault}>
              <IconSymbol name="person.fill" size={avatarSize * 0.62} color="#7d5236" />
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Text style={styles.avatarEditText}>{t.changePhoto}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.gridArea}>
        <FlatList
          data={ITEMS}
          keyExtractor={(i) => i.key}
          numColumns={3}
          scrollEnabled={false}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => {
            if (item.isSpacer) {
              return <View style={[styles.spacer, { width: buttonSize, height: buttonSize }]} />
            }
            const isLocationButton = item.key === 'location'
            const isLocationActive = isLocationButton && showLocation
            const extraTitleStyle = item.key === 'terms' ? styles.termsTitle : undefined
            const buttonBg = isLocationActive ? styles.gridButtonActive : styles.gridButton
            const iconColor = isLocationActive ? '#fff8f2' : '#7d5236'
            const titleColor = isLocationActive ? '#fff8f2' : '#4b3723'
            return (
              <TouchableOpacity
                style={[buttonBg, { width: buttonSize, height: buttonSize, borderRadius: Math.round(buttonSize * 0.12) }]}
                activeOpacity={0.85}
                onPress={isLocationButton ? toggleLocation : item.key === 'logoff' ? handleLogoff : item.key === 'favorites' ? () => router.push('/favorites') : item.key === 'blocks' ? () => router.push('/blocked') : item.key === 'terms' ? () => setShowTerms(true) : item.key === 'language' ? () => setShowLang(true) : undefined}
              >
                <IconSymbol name={item.icon!} size={iconSize} color={iconColor} />
                <ThemedText type="defaultSemiBold" style={[styles.gridTitle, extraTitleStyle, { fontSize: labelFontSize, color: titleColor }]}>{labelMap[item.key] ?? item.label}</ThemedText>
              </TouchableOpacity>
            )
          }}
        />
      </View>

      {/* Terms of Service Modal */}
      <Modal visible={showTerms} transparent animationType="fade" onRequestClose={() => setShowTerms(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Terms of Service</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalText}>
                {"Last updated: January 1, 2025\n\n"}
                {"1. Acceptance of Terms\n"}
                {"By accessing or using Café Finder, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not use our service. We reserve the right to update these terms at any time without prior notice, because we felt like it.\n\n"}
                {"2. Use of the Service\n"}
                {"You agree to use Café Finder only for lawful purposes and in a manner that does not infringe the rights of others. Prohibited uses include, but are not limited to: excessive espresso consumption, debating whether a flat white is just a small latte, and lingering at a table for more than six hours on a single drip coffee.\n\n"}
                {"3. User Accounts\n"}
                {"You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account, especially if someone else is favoriting cafés on your behalf without your express written consent.\n\n"}
                {"4. Favorites & Data\n"}
                {"Cafés you mark as favorites are stored securely on our servers. We are not responsible if your taste in coffee changes and you later regret saving a café that serves oat milk as the default. All data is retained indefinitely, or until our database has a bad day.\n\n"}
                {"5. Limitation of Liability\n"}
                {"Café Finder is not liable for any damages arising from: cold brew shortages, incorrect opening hours, overcrowded communal tables, or the unavailability of a window seat. Our total liability to you shall not exceed the cost of one medium latte.\n\n"}
                {"6. Governing Law\n"}
                {"These terms are governed by the laws of the State of California, excluding its conflict of law provisions. Any disputes shall be resolved over a shared pour-over at a mutually agreed upon café, chosen by coin toss.\n\n"}
                {"7. Contact\n"}
                {"If you have any questions about these Terms, please email us at definitely-real-legal@cafefinder.example. We read every email eventually, usually after a second cup."}
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowTerms(false)} activeOpacity={0.8}>
              <Text style={styles.modalCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal visible={showLang} transparent animationType="fade" onRequestClose={() => setShowLang(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t.selectLanguage}</Text>
            <View style={styles.langList}>
              {LANGUAGES.map(l => (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.langRow, lang === l.code && styles.langRowSelected]}
                  onPress={() => setLang(l.code)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.langNative, lang === l.code && styles.langNativeSelected]}>{l.native}</Text>
                  <Text style={[styles.langLabel, lang === l.code && styles.langLabelSelected]}>{l.label}</Text>
                  {lang === l.code && (
                    <IconSymbol name="checkmark" size={18} color="#7d5236" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowLang(false)} activeOpacity={0.8}>
              <Text style={styles.modalCloseText}>{t.done}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topArea: { flex: 0.28, alignItems: 'center', justifyContent: 'center' },
  avatarButton: { width: 200, height: 200, borderRadius: 100, overflow: 'hidden', borderWidth: 6, borderColor: '#7d5236', backgroundColor: '#fff8f2' },
  avatar: { width: '100%', height: '100%', borderRadius: 100, overflow: 'hidden' },
  avatarDefault: { width: '100%', height: '100%', borderRadius: 100, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3e8dc' },
  avatarEditBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 5, backgroundColor: 'rgba(125, 82, 54, 0.7)', alignItems: 'center', borderBottomLeftRadius: 100, borderBottomRightRadius: 100 },
  avatarEditText: { color: '#fff8f2', fontSize: 11, fontWeight: '600' },
  gridArea: { flex: 0.62, paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', width: '70%', alignSelf: 'center' },
  row: { justifyContent: 'center', gap: 16, marginBottom: 16, width: '100%' },
  gridButton: { backgroundColor: '#fff8f2', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10, width: 120, height: 120, alignItems: 'center', justifyContent: 'center', shadowColor: '#8b5e34', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  gridButtonActive: { backgroundColor: '#7d5236', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10, width: 120, height: 120, alignItems: 'center', justifyContent: 'center', shadowColor: '#8b5e34', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  spacer: { width: 120, height: 120 },
  gridTitle: { color: '#4b3723', fontSize: 14, marginTop: 6, textAlign: 'center', width: '100%', lineHeight: 18 },
  footer: { flex: 0.12 },
  termsTitle: { lineHeight: 22 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(75, 55, 35, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff8f2', borderRadius: 24, padding: 24, maxHeight: '75%', width: '100%', shadowColor: '#8b5e34', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#4b3723', marginBottom: 14, textAlign: 'center' },
  modalScroll: { marginBottom: 16 },
  modalText: { fontSize: 13, color: '#7a5f4d', lineHeight: 20 },
  modalClose: { backgroundColor: '#7d5236', borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  modalCloseText: { color: '#fff8f2', fontWeight: '700', fontSize: 15 },
  langList: { marginBottom: 8 },
  langRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  langRowSelected: { backgroundColor: '#f3e8dc' },
  langNative: { fontSize: 16, fontWeight: '600', color: '#4b3723', flex: 1 },
  langNativeSelected: { color: '#7d5236' },
  langLabel: { fontSize: 14, color: '#9b7a5e', marginRight: 8 },
  langLabelSelected: { color: '#7d5236' },
})
