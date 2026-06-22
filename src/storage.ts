import type { FinanceData, Transaction } from './types'

const STORAGE_KEY = 'aqsha-data-v4'

export const emptyData = (): FinanceData => ({
  version: 4,
  accounts: [{ id: 'main', name: 'Основной счет', type: 'card', initialBalance: 0, color: '#2e9e80' }],
  transactions: [],
  recurring: [],
  goals: [],
  debts: [],
  categoryBudgets: {},
  profile: { name: 'Пользователь', monthlyBudget: 0, salaryDay: 1 },
})

export function loadData(): FinanceData {
  try {
    const current = localStorage.getItem(STORAGE_KEY)
    if (current) return { ...emptyData(), ...JSON.parse(current) }

    const oldTransactions = JSON.parse(localStorage.getItem('aqsha-transactions-v3') || '[]') as Array<Partial<Transaction>>
    const data = emptyData()
    data.transactions = oldTransactions.map(item => ({
      id: item.id || Date.now() + Math.random(),
      title: item.title || 'Операция',
      category: item.category || 'Другое',
      amount: item.amount || 0,
      kind: item.kind || 'expense',
      createdAt: item.createdAt || new Date().toISOString(),
      accountId: 'main',
    }))
    data.recurring = (JSON.parse(localStorage.getItem('aqsha-recurring-v3') || '[]') as Array<Record<string, unknown>>).map(item => ({
      id: Number(item.id) || Date.now() + Math.random(), title: String(item.title || 'Платеж'), amount: Number(item.amount) || 0,
      day: Number(item.day) || 1, category: String(item.category || 'Другое'), accountId: 'main', autoPost: false,
    }))
    data.goals = JSON.parse(localStorage.getItem('aqsha-goals-v2') || '[]')
    const oldProfile = JSON.parse(localStorage.getItem('aqsha-profile-v2') || '{}')
    data.profile = { name: oldProfile.name || 'Пользователь', monthlyBudget: oldProfile.budget || 0, salaryDay: 1 }
    return data
  } catch {
    return emptyData()
  }
}

export const saveData = (data: FinanceData) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
export const storageKey = STORAGE_KEY
