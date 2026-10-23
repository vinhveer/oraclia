export { supabase, accessToken, functionsUrl, siteUrl, setRemember, isRemembering } from './client'
export {
  signIn,
  signUp,
  signOut,
  currentUser,
  loadProfile,
  onAuthChange,
  passkeySupported,
  passkeyEnabled,
  signInWithPasskey,
  listPasskeys,
  registerPasskey,
  deletePasskey,
  type Passkey,
  type SessionUser,
} from './auth'
export {
  listConversations,
  createConversation,
  deleteConversation,
  listMessages,
  searchConversations,
  deleteMessagesFrom,
  listMemories,
  updateMemory,
  deleteMemory,
  rateMessage,
  listRatings,
  type Memory,
  type Rating,
  getUserSettings,
  saveUserSettings,
  listRememberedSummaries,
  type Conversation,
  type Message,
  type UserSettings,
} from './queries'
export { ask, selectCards, reflect, answerClarify, type AgentEvent, type AskInput, type SelectInput, type ClarifyInput } from './agent'
export { subscribeToConversation } from './realtime'
export type {
  Casting,
  DeckKind,
  DrawnCard,
  Hexagram,
  MemoryKind,
  MessageRow,
  Orientation,
} from './database.types'
