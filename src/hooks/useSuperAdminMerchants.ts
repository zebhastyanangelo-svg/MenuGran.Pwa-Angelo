import { useState } from 'react'
import {
  createMerchantAccount,
  deleteMerchant,
  listMerchantsWithOwners,
  type MerchantAccountListItem,
} from '../services/superAdminService'
import type { CreateMerchantAccountInput } from '../utils/merchantRegistration'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface UseSuperAdminMerchantsResult {
  merchants: MerchantAccountListItem[]
  isLoading: boolean
  error: string | null
  lastCreatedPassword: string | null
  addMerchant: (input: CreateMerchantAccountInput) => Promise<MerchantAccountListItem['id']>
  removeMerchant: (merchant: MerchantAccountListItem) => Promise<void>
}

export function useSuperAdminMerchants(): UseSuperAdminMerchantsResult {
  const queryClient = useQueryClient()
  const [lastCreatedPassword, setLastCreatedPassword] = useState<string | null>(null)

  const {
    data: merchants,
    isLoading: isListLoading,
    isError,
    error,
  } = useQuery<MerchantAccountListItem[], Error>({
    queryKey: ['superAdminMerchants'],
    queryFn: async () => listMerchantsWithOwners(),
  })

  const { mutateAsync: addMerchant, isPending: isAdding } = useMutation<
    MerchantAccountListItem['id'],
    Error,
    CreateMerchantAccountInput
  >({
    mutationKey: ['addMerchant'],
    mutationFn: async (input: CreateMerchantAccountInput) => {
      const result = await createMerchantAccount(input)
      setLastCreatedPassword(result.temporaryPassword)
      return result.merchantId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superAdminMerchants'] })
    },
  })

  const { mutateAsync: removeMerchant, isPending: isRemoving } = useMutation<
    void,
    Error,
    MerchantAccountListItem
  >({
    mutationKey: ['removeMerchant'],
    mutationFn: async (merchant: MerchantAccountListItem) => {
      if (merchant.owner_id === null || merchant.owner_id.trim() === '') {
        throw new Error('El comercio no tiene un propietario asociado.')
      }
      await deleteMerchant(merchant.id, merchant.owner_id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superAdminMerchants'] })
    },
  })

  return {
    merchants: merchants ?? [],
    isLoading: isListLoading || isAdding || isRemoving,
    error: isError ? (error instanceof Error ? error.message : String(error)) : null,
    lastCreatedPassword,
    addMerchant: async (input: CreateMerchantAccountInput) => await addMerchant(input),
    removeMerchant: async (merchant: MerchantAccountListItem) =>
      await removeMerchant(merchant),
  }
}

export default useSuperAdminMerchants