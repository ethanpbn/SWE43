import React from 'react'
import { View, StyleSheet, TouchableOpacity, Image, FlatList, useWindowDimensions } from 'react-native'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol'

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

  // Responsive sizes (clamped)
  const avatarSize = Math.max(120, Math.min(200, Math.floor(Math.min(width, height) * 0.36)))
  const buttonSize = Math.max(64, Math.min(140, Math.floor(Math.min(width, height) * 0.18)))
  const iconSize = Math.max(20, Math.floor(buttonSize * 0.36))
  const labelFontSize = Math.max(10, Math.floor(buttonSize * 0.12) + 8)
  const gridWidth = Math.min(width * 0.75, buttonSize * 3 + 48)
  return (
    <ThemedView style={styles.container}>
      <View style={styles.topArea}>
        <TouchableOpacity style={[styles.avatarButton, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]} activeOpacity={0.9}>
          <Image
            source={{ uri: 'https://via.placeholder.com/480x480.png?text=Profile' }}
            style={styles.avatar}
            resizeMode="cover"
          />
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
            const extraTitleStyle = item.key === 'terms' ? styles.termsTitle : undefined
            return (
              <TouchableOpacity style={[styles.gridButton, { width: buttonSize, height: buttonSize, borderRadius: Math.round(buttonSize * 0.12) }]} activeOpacity={0.85}>
                <IconSymbol name={item.icon!} size={iconSize} color="#7d5236" />
                <ThemedText type="defaultSemiBold" style={[styles.gridTitle, extraTitleStyle, { fontSize: labelFontSize }]}>{item.label}</ThemedText>
              </TouchableOpacity>
            )
          }}
        />
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topArea: { flex: 0.28, alignItems: 'center', justifyContent: 'center' },
  avatarButton: { width: 200, height: 200, borderRadius: 100, overflow: 'hidden', borderWidth: 6, borderColor: '#7d5236', backgroundColor: '#fff8f2' },
  avatar: { width: '100%', height: '100%' },
  gridArea: { flex: 0.62, paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', width: '70%', alignSelf: 'center' },
  row: { justifyContent: 'center', gap: 16, marginBottom: 16, width: '100%' },
  gridButton: { backgroundColor: '#fff8f2', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10, width: 120, height: 120, alignItems: 'center', justifyContent: 'center', shadowColor: '#8b5e34', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  spacer: { width: 120, height: 120 },
  gridTitle: { color: '#4b3723', fontSize: 14, marginTop: 6, textAlign: 'center', width: '100%', lineHeight: 18 },
  footer: { flex: 0.12 },
  termsTitle: { lineHeight: 22 },
})