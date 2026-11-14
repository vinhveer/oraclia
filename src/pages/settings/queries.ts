import { useMutation, useQuery } from '@tanstack/react-query'
import {
  deleteMemory,
  forgetEverything,
  getUserSettings,
  listMemories,
  listRememberedSummaries,
  saveUserSettings,
  updateMemory,
  type UserSettings,
} from '@db'
import { queryClient } from '@/features/conversations/queries'
import { notify } from '@/app/notify'

export const settingsKeys = {
  settings: ['settings'] as const,
  memories: ['memories'] as const,
  summaries: ['summaries'] as const,
}

export const useUserSettings = () =>
  useQuery({ queryKey: settingsKeys.settings, queryFn: getUserSettings })

export const useMemories = () => useQuery({ queryKey: settingsKeys.memories, queryFn: listMemories })

export const useSummaries = () =>
  useQuery({ queryKey: settingsKeys.summaries, queryFn: listRememberedSummaries })

const fail = (error: Error) =>
  notify({ color: 'red', message: error.message || 'Không lưu được.' })

export function useSaveSettings() {
  return useMutation({
    mutationFn: (patch: Partial<UserSettings>) => saveUserSettings(patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.settings })
      notify({ message: 'Đã lưu.' })
    },
    onError: fail,
  })
}

export function useUpdateMemory() {
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; content?: string; importance?: number }) =>
      updateMemory(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.memories }),
    onError: fail,
  })
}

export function useDeleteMemory() {
  return useMutation({
    mutationFn: deleteMemory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.memories }),
    onError: fail,
  })
}

export function useForgetEverything() {
  return useMutation({
    mutationFn: forgetEverything,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.memories })
      queryClient.invalidateQueries({ queryKey: settingsKeys.summaries })
      const total = result.memories + result.readings + result.summaries
      notify({
        message: total ? 'Oraclia đã quên hết những gì từng ghi nhớ về bạn.' : 'Không có gì để quên.',
      })
    },
    onError: fail,
  })
}
