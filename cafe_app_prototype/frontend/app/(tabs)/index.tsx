import { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from 'expo-router'
import { useAuth } from '@/context/auth'
import { ThemedView } from '@/components/themed-view'
import { IconSymbol } from '@/components/ui/icon-symbol'
import { useLanguage, type LangCode } from '@/context/language'

const API = 'http://localhost:3000'

type Cafe = {
  id: number
  name: string
  location: string
  description: string
  logo_url: string
}

const DESCRIPTIONS: Partial<Record<number, Partial<Record<LangCode, string>>>> = {
  1: { // Kean Coffee
    es: 'Tostador especializado premiado, reconocido por su espresso de origen único y pour-overs artesanales.',
    fr: 'Torréfacteur spécialisé primé, reconnu pour ses expressos mono-origine et ses pour-overs soigneusement préparés.',
    zh: '屡获殊荣的精品烘焙商，以单一产地浓缩咖啡和精心冲泡的手冲咖啡著称。',
    ja: '受賞歴のあるスペシャルティロースター。シングルオリジンエスプレッソと丁寧なプアオーバーで知られる。',
    ko: '수상 경력의 스페셜티 로스터로, 단일 원산지 에스프레소와 정성스러운 핸드드립으로 유명합니다.',
  },
  2: { // Portola Coffee
    es: 'Café de la granja a la taza con menús de temporada y un ambiente cálido y acogedor.',
    fr: 'Café de la ferme à la tasse avec des menus saisonniers et une atmosphère chaleureuse et accueillante.',
    zh: '从农场到杯子的咖啡，配以季节性菜单和温馨的氛围。',
    ja: '農場から一杯へ。季節のメニューと温かくくつろげる雰囲気が魅力。',
    ko: '농장에서 컵으로 이어지는 커피, 계절 메뉴와 따뜻하고 편안한 분위기.',
  },
  3: { // Philz Coffee
    es: 'Preparado a mano taza por taza: mezclas exclusivas hechas exactamente a tu gusto.',
    fr: 'Préparé à la main, une tasse à la fois — des mélanges signature adaptés exactement à votre goût.',
    zh: '一次只做一杯，手工制作——专属混合咖啡完全按照您的口味定制。',
    ja: '一杯一杯ていねいに手作り。あなたの好みに合わせたシグネチャーブレンド。',
    ko: '한 번에 한 잔씩 손으로 만들어—당신의 취향에 맞춘 시그니처 블렌드.',
  },
  4: { // Starbucks
    es: 'Tu cafetería de barrio para bebidas artesanales, comida fresca y Wi-Fi gratuito.',
    fr: 'Votre café de quartier pour des boissons artisanales, de la nourriture fraîche et le Wi-Fi gratuit.',
    zh: '您家附近的咖啡馆，提供手工饮品、新鲜食品和免费Wi-Fi。',
    ja: '地域に根ざしたコーヒーハウス。手作りドリンク、新鮮な食事、無料Wi-Fiを提供。',
    ko: '동네 커피숍에서 수제 음료, 신선한 음식, 무료 Wi-Fi를 즐기세요.',
  },
  5: { // The Coffee Bean & Tea Leaf
    es: 'Café y té premium desde 1963, famoso por sus bebidas mezcladas Ice Blended®.',
    fr: 'Café et thé premium depuis 1963, célèbre pour ses boissons Ice Blended®.',
    zh: '自1963年起提供优质咖啡和茶，以冰沙Ice Blended®饮品闻名。',
    ja: '1963年創業のプレミアムコーヒー＆ティー。アイスブレンデッド®ドリンクで有名。',
    ko: '1963년부터 이어온 프리미엄 커피와 차, Ice Blended® 음료로 유명합니다.',
  },
  6: { // 85°C Bakery Cafe
    es: 'Panadería café estilo taiwanés con productos horneados frescos y el icónico café con sal marina.',
    fr: 'Café-boulangerie de style taïwanais proposant des pâtisseries fraîches et le célèbre café au sel de mer.',
    zh: '台式烘焙咖啡馆，供应新鲜烘焙糕点和标志性海盐咖啡。',
    ja: '台湾スタイルのベーカリーカフェ。焼きたてのパンと名物の海塩コーヒーを提供。',
    ko: '대만식 베이커리 카페로 갓 구운 빵과 시그니처 바다 소금 커피를 제공합니다.',
  },
  7: { // Peet's Coffee
    es: 'Café tostado profundo y artesanal con un legado de calidad sin concesiones desde 1966.',
    fr: 'Café torréfié en profondeur et artisanal avec un héritage de qualité irréprochable depuis 1966.',
    zh: '深度烘焙的手工咖啡，自1966年以来秉承不妥协的品质传承。',
    ja: '1966年以来の妥協なき品質の伝統。深煎りの手作りコーヒー。',
    ko: '1966년부터 이어온 타협 없는 품질의 전통, 깊게 로스팅된 수제 커피.',
  },
  8: { // Bear Coast Coffee
    es: 'Café de cultura surf de SoCal con mezclas de origen único y un ambiente relajado.',
    fr: 'Café de la culture surf de SoCal avec des cafés mono-origine de qualité et une ambiance décontractée.',
    zh: '南加州冲浪文化咖啡馆，提供优质单一产地咖啡和休闲氛围。',
    ja: '南カリフォルニアのサーフカルチャーカフェ。シングルオリジンの高品質コーヒーとのんびりした雰囲気。',
    ko: '소칼 서핑 문화 카페로 싱글 오리진 고품질 커피와 느긋한 분위기를 즐길 수 있습니다.',
  },
}

function getDescription(cafe: Cafe, lang: LangCode): string {
  if (lang === 'en') return cafe.description
  return DESCRIPTIONS[cafe.id]?.[lang] ?? cafe.description
}

export default function HomeScreen() {
  const [cafes, setCafes] = useState<Cafe[]>([])
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [failedLogos, setFailedLogos] = useState<Set<number>>(new Set())
  const { email, token } = useAuth()
  const { t, lang } = useLanguage()

  useEffect(() => {
    fetch(`${API}/api/cafes`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCafes(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!email) { setFavorites(new Set()); return }
    AsyncStorage.getItem(`favorites_${email}`).then(v => {
      if (v) setFavorites(new Set(JSON.parse(v)))
    })
  }, [email])

  useEffect(() => {
    if (!token || !email) return
    fetch(`${API}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFavorites(new Set(data))
          AsyncStorage.setItem(`favorites_${email}`, JSON.stringify(data))
        }
      })
      .catch(() => {})
  }, [token, email])

  useFocusEffect(
    useCallback(() => {
      if (!email) return
      AsyncStorage.getItem(`favorites_${email}`).then(v => {
        if (v) setFavorites(new Set(JSON.parse(v)))
      })
    }, [email])
  )

  const toggleFavorite = async (cafeId: number) => {
    if (!token || !email) return
    const isFav = favorites.has(cafeId)
    setFavorites(prev => {
      const next = new Set(prev)
      isFav ? next.delete(cafeId) : next.add(cafeId)
      AsyncStorage.setItem(`favorites_${email}`, JSON.stringify([...next]))
      return next
    })
    const res = await fetch(`${API}/api/favorites/${cafeId}`, {
      method: isFav ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null)
    if (!res || !res.ok) {
      setFavorites(prev => {
        const rollback = new Set(prev)
        isFav ? rollback.add(cafeId) : rollback.delete(cafeId)
        AsyncStorage.setItem(`favorites_${email}`, JSON.stringify([...rollback]))
        return rollback
      })
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.cafesNearYou}</Text>
          <Text style={styles.subtitle}>{t.discoverSpot}</Text>
          {email ? <Text style={styles.emailText}>{email}</Text> : null}
        </View>

        {cafes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t.noCafesYet}</Text>
            <Text style={styles.emptyText}>{t.tryRefreshing}</Text>
          </View>
        ) : (
          <FlatList
            data={cafes}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isFav = favorites.has(item.id)
              return (
                <View style={styles.cafeCard}>
                  {!failedLogos.has(item.id) && (
                    <Image
                      source={{ uri: item.logo_url }}
                      style={styles.logo}
                      resizeMode="contain"
                      onError={() => setFailedLogos(prev => new Set(prev).add(item.id))}
                    />
                  )}
                  <View style={styles.cafeInfo}>
                    <Text style={styles.cafeName}>{item.name}</Text>
                    {item.location ? <Text style={styles.cafeLocation}>{item.location}</Text> : null}
                    {item.description ? <Text style={styles.cafeDescription}>{getDescription(item, lang)}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.heartButton} activeOpacity={0.7}>
                    <IconSymbol
                      name={isFav ? 'heart.fill' : 'heart'}
                      size={24}
                      color={isFav ? '#7d5236' : '#c4a882'}
                    />
                  </TouchableOpacity>
                </View>
              )
            }}
          />
        )}
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 20 },
  header: { backgroundColor: '#fbf1e6', borderRadius: 24, padding: 20, marginBottom: 18, shadowColor: '#8b5e34', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  title: { fontSize: 26, fontWeight: '700', color: '#4b3723', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#7d5a44', marginBottom: 2 },
  emailText: { fontSize: 13, color: '#8e725f', marginTop: 4 },
  emptyCard: { backgroundColor: '#fff7ef', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#8b5e34', shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#4b3723', marginBottom: 6 },
  emptyText: { fontSize: 15, color: '#7a5f4d', textAlign: 'center' },
  list: { paddingTop: 4 },
  cafeCard: { backgroundColor: '#fff8f2', borderRadius: 20, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#8b5e34', shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  logo: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#f3e8dc', marginRight: 14, flexShrink: 0 },
  cafeInfo: { flex: 1 },
  cafeName: { fontSize: 17, fontWeight: '700', color: '#4f3421', marginBottom: 2 },
  cafeLocation: { fontSize: 12, color: '#9b7a5e', marginBottom: 4 },
  cafeDescription: { fontSize: 13, color: '#7a5f4d', lineHeight: 18 },
  heartButton: { paddingLeft: 12, paddingVertical: 4 },
})
