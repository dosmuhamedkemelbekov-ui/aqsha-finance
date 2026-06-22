export type Kind = 'expense' | 'income'

export type Account = {
  id: string
  name: string
  type: 'card' | 'cash' | 'deposit' | 'other'
  initialBalance: number
  color: string
}

export type Transaction = {
  id: number
  title: string
  category: string
  amount: number
  kind: Kind
  createdAt: string
  accountId: string
}

export type Recurring = {
  id: number
  title: string
  amount: number
  day: number
  category: string
  accountId: string
  autoPost: boolean
  lastPostedMonth?: string
}

export type Goal = { id: number; title: string; target: number; saved: number }
export type Debt = { id: number; person: string; kind: 'owe' | 'owed'; total: number; paid: number; dueDate: string }
export type Profile = { name: string; monthlyBudget: number; salaryDay: number }

export type FinanceData = {
  version: 4
  accounts: Account[]
  transactions: Transaction[]
  recurring: Recurring[]
  goals: Goal[]
  debts: Debt[]
  categoryBudgets: Record<string, number>
  profile: Profile
}
