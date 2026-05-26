import React from 'react'
import { View, StyleSheet, TouchableOpacity, Image, FlatList } from 'react-native'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { IconSymbol } from '@/components/ui/icon-symbol'

const ITEMS = [
  { key: 'favorites', label: 'Favorites', icon: 'heart.fill' },
  { key: 'history', label: 'History', icon: 'clock.fill' },
  { key: 'language', label: 'Language', icon: 'globe' },
  { key: 'location', label: 'Location', icon: 'location.fill' },
  { key: 'blocks', label: 'Blocks', icon: 'nosign' },
  { key: 'terms', label: 'Terms of Service', icon: 'doc.text.fill' },
  { key: 'spacer1', label: '', icon: '', isSpacer: true },
  { key: 'logoff', label: 'Log Off', icon: 'power' },
  { key: 'spacer2', label: '', icon: '', isSpacer: true },
]

export default function ProfileScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.topArea}>
        <TouchableOpacity style={styles.avatarButton} activeOpacity={0.9}>
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
          renderItem={({ item }) => (
            item.isSpacer ? (
              <View style={styles.spacer} />
            ) : (
              <TouchableOpacity style={styles.gridButton} activeOpacity={0.85}>
                <IconSymbol name={item.icon} size={28} color="#7d5236" />
                <ThemedText type="defaultSemiBold" style={styles.gridTitle}>{item.label}</ThemedText>
              </TouchableOpacity>
            )
          )}
        />
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topArea: { flex: 0.25, alignItems: 'center', justifyContent: 'center' },
  avatarButton: { width: 140, height: 140, borderRadius: 70, overflow: 'hidden', borderWidth: 5, borderColor: '#7d5236', backgroundColor: '#fff8f2' },
  avatar: { width: '100%', height: '100%' },
  gridArea: { flex: 0.45, paddingHorizontal: 24, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', width: '55%', alignSelf: 'center' },
  row: { justifyContent: 'center', gap: 12, marginBottom: 12, width: '100%' },
  gridButton: { backgroundColor: '#fff8f2', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 6, width: 85, height: 85, alignItems: 'center', justifyContent: 'center', shadowColor: '#8b5e34', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  spacer: { width: 85, height: 85 },
  gridTitle: { color: '#4b3723', fontSize: 11, marginTop: 4, textAlign: 'center', width: '100%', lineHeight: 12 },
  footer: { flex: 0.1 },
})