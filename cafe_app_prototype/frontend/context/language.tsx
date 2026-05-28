import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type LangCode = 'en' | 'es' | 'fr' | 'zh' | 'ja' | 'ko'

export const LANGUAGES: { code: LangCode; native: string; label: string }[] = [
  { code: 'en', native: 'English',  label: 'English' },
  { code: 'es', native: 'Español',  label: 'Spanish' },
  { code: 'fr', native: 'Français', label: 'French' },
  { code: 'zh', native: '中文',      label: 'Chinese' },
  { code: 'ja', native: '日本語',    label: 'Japanese' },
  { code: 'ko', native: '한국어',    label: 'Korean' },
]

export type Strings = {
  // Tabs
  home: string; explore: string; messages: string; profile: string
  // Profile
  favorites: string; history: string; language: string; location: string
  blocks: string; terms: string; logOff: string; changePhoto: string
  selectLanguage: string; done: string
  // Home
  cafesNearYou: string; discoverSpot: string; noCafesYet: string; tryRefreshing: string
  // Explore
  exploreSubtitle: string
  // Explore badge
  topPicksNearby: string; tapMarker: string
  locationLabel: string; hoursLabel: string; specialtyLabel: string
  // Hours status
  open24h: string; openNow: string; closes: string; closedOpens: string
  // Messages
  search: string; noMessages: string; noNearbyUsers: string
  enableLocation: string; noResults: string; noResultsMatch: string
  noMessagesSent: string; nowLabel: string; blockedLabel: string; youHaveBlocked: string
  // Blocked
  blockedUsers: string; noBlockedUsers: string; usersBlockAppear: string; unblock: string
  // Conversation
  sayHello: string; messagePlaceholder: string
}

const EN: Strings = {
  home: 'Home', explore: 'Explore', messages: 'Messages', profile: 'Profile',
  favorites: 'Favorites', history: 'History', language: 'Language', location: 'Location',
  blocks: 'Blocks', terms: 'Terms of Service', logOff: 'Log Off', changePhoto: 'Change Photo',
  selectLanguage: 'Select Language', done: 'Done',
  cafesNearYou: 'Cafes Near You', discoverSpot: 'Discover your next favorite spot.',
  noCafesYet: 'No cafes yet', tryRefreshing: 'Try refreshing or check back later.',
  exploreSubtitle: 'Find cafes, see routes, and explore the map.',
  topPicksNearby: 'Top picks nearby', tapMarker: 'Tap a marker to see details.',
  locationLabel: 'Location', hoursLabel: 'Hours', specialtyLabel: 'Specialty',
  open24h: 'Open 24 hours', openNow: 'Open now', closes: 'Closes', closedOpens: 'Closed · Opens',
  search: 'Search', noMessages: 'No Messages',
  noNearbyUsers: 'No nearby users right now.',
  enableLocation: 'Turn on Location in Profile to see nearby users.',
  noResults: 'No results', noResultsMatch: 'No conversations match',
  noMessagesSent: 'No messages yet', nowLabel: 'Now', blockedLabel: 'Blocked',
  youHaveBlocked: 'You have blocked this user.',
  blockedUsers: 'Blocked Users', noBlockedUsers: 'No blocked users',
  usersBlockAppear: 'Users you block will appear here.', unblock: 'Unblock',
  sayHello: 'Say hello to {name}!', messagePlaceholder: 'Message',
}

const ES: Strings = {
  home: 'Inicio', explore: 'Explorar', messages: 'Mensajes', profile: 'Perfil',
  favorites: 'Favoritos', history: 'Historial', language: 'Idioma', location: 'Ubicación',
  blocks: 'Bloqueos', terms: 'Términos', logOff: 'Salir', changePhoto: 'Cambiar foto',
  selectLanguage: 'Seleccionar idioma', done: 'Listo',
  cafesNearYou: 'Cafés cerca de ti', discoverSpot: 'Descubre tu próximo lugar favorito.',
  noCafesYet: 'Sin cafés aún', tryRefreshing: 'Intenta actualizar o vuelve más tarde.',
  exploreSubtitle: 'Encuentra cafés, ve rutas y explora el mapa.',
  topPicksNearby: 'Mejores opciones', tapMarker: 'Toca un marcador para ver detalles.',
  locationLabel: 'Ubicación', hoursLabel: 'Horario', specialtyLabel: 'Especialidad',
  open24h: 'Abierto 24 horas', openNow: 'Abierto ahora', closes: 'Cierra', closedOpens: 'Cerrado · Abre',
  search: 'Buscar', noMessages: 'Sin mensajes',
  noNearbyUsers: 'No hay usuarios cercanos.',
  enableLocation: 'Activa la ubicación en Perfil para ver usuarios.',
  noResults: 'Sin resultados', noResultsMatch: 'Ninguna conversación coincide con',
  noMessagesSent: 'Aún sin mensajes', nowLabel: 'Ahora', blockedLabel: 'Bloqueado',
  youHaveBlocked: 'Has bloqueado a este usuario.',
  blockedUsers: 'Usuarios bloqueados', noBlockedUsers: 'Sin usuarios bloqueados',
  usersBlockAppear: 'Los usuarios bloqueados aparecerán aquí.', unblock: 'Desbloquear',
  sayHello: '¡Di hola a {name}!', messagePlaceholder: 'Mensaje',
}

const FR: Strings = {
  home: 'Accueil', explore: 'Explorer', messages: 'Messages', profile: 'Profil',
  favorites: 'Favoris', history: 'Historique', language: 'Langue', location: 'Localisation',
  blocks: 'Bloqués', terms: 'CGU', logOff: 'Déconnexion', changePhoto: 'Changer photo',
  selectLanguage: 'Choisir la langue', done: 'Fermer',
  cafesNearYou: 'Cafés près de chez vous', discoverSpot: 'Découvrez votre prochain endroit favori.',
  noCafesYet: 'Aucun café pour l\'instant', tryRefreshing: 'Essayez de rafraîchir ou revenez plus tard.',
  exploreSubtitle: 'Trouvez des cafés, voyez les itinéraires et explorez la carte.',
  topPicksNearby: 'Meilleures options', tapMarker: 'Appuyez sur un marqueur pour les détails.',
  locationLabel: 'Adresse', hoursLabel: 'Horaires', specialtyLabel: 'Spécialité',
  open24h: 'Ouvert 24h/24', openNow: 'Ouvert maintenant', closes: 'Ferme', closedOpens: 'Fermé · Ouvre',
  search: 'Rechercher', noMessages: 'Aucun message',
  noNearbyUsers: 'Aucun utilisateur à proximité.',
  enableLocation: 'Activez la localisation dans Profil pour voir les utilisateurs.',
  noResults: 'Aucun résultat', noResultsMatch: 'Aucune conversation ne correspond à',
  noMessagesSent: 'Pas encore de messages', nowLabel: 'Maintenant', blockedLabel: 'Bloqué',
  youHaveBlocked: 'Vous avez bloqué cet utilisateur.',
  blockedUsers: 'Utilisateurs bloqués', noBlockedUsers: 'Aucun utilisateur bloqué',
  usersBlockAppear: 'Les utilisateurs bloqués s\'afficheront ici.', unblock: 'Débloquer',
  sayHello: 'Dites bonjour à {name}!', messagePlaceholder: 'Message',
}

const ZH: Strings = {
  home: '首页', explore: '探索', messages: '消息', profile: '我的',
  favorites: '收藏', history: '历史', language: '语言', location: '位置',
  blocks: '屏蔽', terms: '服务条款', logOff: '退出', changePhoto: '更换照片',
  selectLanguage: '选择语言', done: '完成',
  cafesNearYou: '附近的咖啡馆', discoverSpot: '发现您的下一个最爱地点。',
  noCafesYet: '暂无咖啡馆', tryRefreshing: '请刷新页面或稍后再试。',
  exploreSubtitle: '发现咖啡馆，查看路线，探索地图。',
  topPicksNearby: '附近推荐', tapMarker: '点击标记查看详情。',
  locationLabel: '地址', hoursLabel: '营业时间', specialtyLabel: '特色',
  open24h: '24小时营业', openNow: '营业中', closes: '打烊', closedOpens: '已打烊 · 开门',
  search: '搜索', noMessages: '暂无消息',
  noNearbyUsers: '附近暂无用户。',
  enableLocation: '请在"我的"中开启位置以查看附近用户。',
  noResults: '无结果', noResultsMatch: '没有符合',
  noMessagesSent: '暂无消息', nowLabel: '刚刚', blockedLabel: '已屏蔽',
  youHaveBlocked: '您已屏蔽此用户。',
  blockedUsers: '已屏蔽用户', noBlockedUsers: '暂无屏蔽用户',
  usersBlockAppear: '被屏蔽的用户将显示在这里。', unblock: '解除屏蔽',
  sayHello: '向{name}打个招呼吧！', messagePlaceholder: '消息',
}

const JA: Strings = {
  home: 'ホーム', explore: '探索', messages: 'メッセージ', profile: 'プロフィール',
  favorites: 'お気に入り', history: '履歴', language: '言語', location: '位置情報',
  blocks: 'ブロック', terms: '利用規約', logOff: 'ログアウト', changePhoto: '写真変更',
  selectLanguage: '言語を選択', done: '完了',
  cafesNearYou: '近くのカフェ', discoverSpot: '次のお気に入りスポットを見つけよう。',
  noCafesYet: 'カフェが見つかりません', tryRefreshing: '更新するか、後でもう一度お試しください。',
  exploreSubtitle: 'カフェを探して、ルートを確認し、地図を探索しよう。',
  topPicksNearby: '近くのカフェ', tapMarker: 'マーカーをタップして詳細を確認。',
  locationLabel: '住所', hoursLabel: '営業時間', specialtyLabel: 'こだわり',
  open24h: '24時間営業', openNow: '営業中', closes: '終了', closedOpens: '閉店中 · 開店',
  search: '検索', noMessages: 'メッセージなし',
  noNearbyUsers: '近くにユーザーはいません。',
  enableLocation: 'プロフィールで位置情報をオンにしてください。',
  noResults: '結果なし', noResultsMatch: '一致する会話がありません',
  noMessagesSent: 'まだメッセージなし', nowLabel: '今', blockedLabel: 'ブロック済み',
  youHaveBlocked: 'このユーザーをブロックしました。',
  blockedUsers: 'ブロックリスト', noBlockedUsers: 'ブロックなし',
  usersBlockAppear: 'ブロックしたユーザーが表示されます。', unblock: 'ブロック解除',
  sayHello: '{name}に挨拶しよう！', messagePlaceholder: 'メッセージ',
}

const KO: Strings = {
  home: '홈', explore: '탐색', messages: '메시지', profile: '프로필',
  favorites: '즐겨찾기', history: '기록', language: '언어', location: '위치',
  blocks: '차단', terms: '이용약관', logOff: '로그아웃', changePhoto: '사진 변경',
  selectLanguage: '언어 선택', done: '완료',
  cafesNearYou: '근처 카페', discoverSpot: '다음 즐겨찾기 장소를 발견하세요.',
  noCafesYet: '카페 없음', tryRefreshing: '새로고침하거나 나중에 다시 확인하세요.',
  exploreSubtitle: '카페를 찾고, 경로를 보고, 지도를 탐색하세요.',
  topPicksNearby: '주변 추천', tapMarker: '마커를 눌러 상세 정보를 확인하세요.',
  locationLabel: '주소', hoursLabel: '영업시간', specialtyLabel: '특선',
  open24h: '24시간 영업', openNow: '영업 중', closes: '마감', closedOpens: '마감 · 오픈',
  search: '검색', noMessages: '메시지 없음',
  noNearbyUsers: '주변에 사용자가 없습니다.',
  enableLocation: '프로필에서 위치를 켜서 주변 사용자를 확인하세요.',
  noResults: '결과 없음', noResultsMatch: '일치하는 대화가 없습니다',
  noMessagesSent: '아직 메시지 없음', nowLabel: '방금', blockedLabel: '차단됨',
  youHaveBlocked: '이 사용자를 차단했습니다.',
  blockedUsers: '차단 목록', noBlockedUsers: '차단 없음',
  usersBlockAppear: '차단한 사용자가 여기에 표시됩니다.', unblock: '차단 해제',
  sayHello: '{name}에게 인사해보세요!', messagePlaceholder: '메시지',
}

const ALL: Record<LangCode, Strings> = { en: EN, es: ES, fr: FR, zh: ZH, ja: JA, ko: KO }

type LanguageContextType = { lang: LangCode; t: Strings; setLang: (l: LangCode) => void }

const LanguageContext = createContext<LanguageContextType>({ lang: 'en', t: EN, setLang: () => {} })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('en')

  useEffect(() => {
    AsyncStorage.getItem('app_language').then(v => {
      if (v && v in ALL) setLangState(v as LangCode)
    })
  }, [])

  const setLang = useCallback((code: LangCode) => {
    setLangState(code)
    AsyncStorage.setItem('app_language', code)
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, t: ALL[lang], setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
