import { useEffect, useMemo, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import {
  ArrowDownLeft, ArrowUpRight, Bell, CalendarDays, Car, Check, ChevronDown,
  CircleDollarSign, Coffee, CreditCard, Download, Home, LayoutDashboard,
  MoreHorizontal, Pencil, Plus, Repeat2, Search, Settings, ShoppingBag,
  Smartphone, Sparkles, Target, Trash2, Upload, Utensils, WalletCards, WifiOff, X,
} from 'lucide-react'

type Kind = 'expense' | 'income'
type Transaction = { id: number; title: string; category: string; amount: number; kind: Kind; createdAt: string }
type Recurring = { id: number; title: string; amount: number; day: number; category: string; paid: boolean }
type Goal = { id: number; title: string; target: number; saved: number }
type Profile = { name: string; budget: number }
type Modal = { type: 'transaction'; kind: Kind } | { type: 'recurring' } | { type: 'goal' } | null

const txSeed: Transaction[] = [
  { id: 1, title: 'Magnum', category: 'Продукты', amount: 18450, kind: 'expense', createdAt: new Date().toISOString() },
  { id: 2, title: 'Зарплата', category: 'Доход', amount: 640000, kind: 'income', createdAt: new Date().toISOString() },
  { id: 3, title: 'Yandex Go', category: 'Транспорт', amount: 2350, kind: 'expense', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 4, title: 'Coffee Boom', category: 'Кафе', amount: 4800, kind: 'expense', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 5, title: 'Kaspi Магазин', category: 'Покупки', amount: 32990, kind: 'expense', createdAt: new Date(Date.now() - 172800000).toISOString() },
]
const recurringSeed: Recurring[] = [
  { id: 1, title: 'Аренда квартиры', amount: 180000, day: 25, category: 'Дом', paid: false },
  { id: 2, title: 'Beeline', amount: 6990, day: 28, category: 'Связь', paid: false },
  { id: 3, title: 'Netflix', amount: 4990, day: 2, category: 'Подписки', paid: true },
]
const goalSeed: Goal[] = [{ id: 1, title: 'Финансовая подушка', target: 1000000, saved: 280000 }]
const expenseCategories = ['Продукты', 'Транспорт', 'Кафе', 'Покупки', 'Дом', 'Подписки', 'Здоровье', 'Другое']
const incomeCategories = ['Доход', 'Подработка', 'Подарки', 'Другое']
const categoryIcons: Record<string, typeof ShoppingBag> = { Продукты: Utensils, Транспорт: Car, Кафе: Coffee, Покупки: ShoppingBag, Доход: CircleDollarSign, Дом: Home, Связь: CreditCard, Подписки: Repeat2 }
const colors = ['#ef7a55', '#e3b449', '#785bd6', '#2e9e80', '#4b91dc', '#df648e']
const money = (v: number) => `${new Intl.NumberFormat('ru-RU').format(v)} ₸`
const read = <T,>(key: string, fallback: T): T => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback } catch { return fallback } }
const save = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value))
const dateLabel = (value: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))

interface InstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => read('aqsha-transactions-v2', txSeed))
  const [recurring, setRecurring] = useState<Recurring[]>(() => read('aqsha-recurring-v2', recurringSeed))
  const [goals, setGoals] = useState<Goal[]>(() => read('aqsha-goals', goalSeed))
  const [profile, setProfile] = useState<Profile>(() => read('aqsha-profile', { name: 'Досмухамед', budget: 300000 }))
  const [active, setActive] = useState('Обзор')
  const [modal, setModal] = useState<Modal>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | Kind>('all')
  const [toast, setToast] = useState('')
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()

  useEffect(() => save('aqsha-transactions-v2', transactions), [transactions])
  useEffect(() => save('aqsha-recurring-v2', recurring), [recurring])
  useEffect(() => save('aqsha-goals', goals), [goals])
  useEffect(() => save('aqsha-profile', profile), [profile])
  useEffect(() => {
    const listener = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', listener)
    return () => window.removeEventListener('beforeinstallprompt', listener)
  }, [])

  const totals = useMemo(() => {
    const income = transactions.filter(t => t.kind === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter(t => t.kind === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [transactions])
  const categoryTotals = useMemo(() => Object.entries(transactions.filter(t => t.kind === 'expense').reduce<Record<string, number>>((a, t) => ({ ...a, [t.category]: (a[t.category] || 0) + t.amount }), {})).sort((a, b) => b[1] - a[1]), [transactions])
  const shownTransactions = useMemo(() => transactions.filter(t => (filter === 'all' || t.kind === filter) && (`${t.title} ${t.category}`).toLowerCase().includes(query.toLowerCase())), [transactions, filter, query])
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2400) }
  const install = async () => { if (!installPrompt) return; await installPrompt.prompt(); const choice = await installPrompt.userChoice; if (choice.outcome === 'accepted') { notify('AQSHA установлена'); setInstallPrompt(null) } }
  const removeTx = (id: number) => { setTransactions(v => v.filter(x => x.id !== id)); notify('Операция удалена') }
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 1, transactions, recurring, goals, profile }, null, 2)], { type: 'application/json' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `aqsha-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href); notify('Резервная копия создана')
  }
  const importData = async (file?: File) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!Array.isArray(data.transactions) || !Array.isArray(data.recurring) || !Array.isArray(data.goals)) throw new Error()
      setTransactions(data.transactions); setRecurring(data.recurring); setGoals(data.goals); if (data.profile) setProfile(data.profile); notify('Данные восстановлены')
    } catch { notify('Файл резервной копии поврежден') }
  }
  const resetData = () => { if (window.confirm('Удалить все ваши данные и вернуть пример?')) { setTransactions([]); setRecurring([]); setGoals([]); notify('Все данные удалены') } }

  const nav = [['Обзор', LayoutDashboard], ['Операции', WalletCards], ['Платежи', Repeat2], ['Цели', Target], ['Настройки', Settings]] as const
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">A</span><span>AQSHA</span></div>
      <nav>{nav.map(([label, Icon]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => setActive(label)}><Icon size={20}/><span>{label}</span></button>)}</nav>
      {installPrompt && <button className="install-side" onClick={install}><Smartphone size={18}/><span><b>Установить AQSHA</b><small>На главный экран</small></span></button>}
      <div className="sidebar-tip"><Sparkles size={20}/><b>Финансовый совет</b><p>Сначала отложите 10% дохода, затем планируйте расходы.</p></div>
      <div className="profile"><span>{profile.name.slice(0, 2).toUpperCase()}</span><div><b>{profile.name}</b><small>Личный профиль</small></div><MoreHorizontal size={20}/></div>
    </aside>

    <main>
      <header><div><p className="eyebrow">{new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(new Date())}</p><h1>Добрый день!</h1></div><div className="header-actions"><button className="icon-button" onClick={() => setActive('Операции')} aria-label="Поиск"><Search size={20}/></button><button className="icon-button dot" aria-label="Уведомления"><Bell size={20}/></button><button className="period">Этот месяц <ChevronDown size={16}/></button></div></header>

      {active === 'Обзор' && <Dashboard totals={totals} budget={profile.budget} categories={categoryTotals} recurring={recurring} transactions={transactions} openTx={kind => setModal({ type: 'transaction', kind })} setActive={setActive} togglePaid={id => setRecurring(v => v.map(x => x.id === id ? { ...x, paid: !x.paid } : x))}/>} 
      {active === 'Операции' && <Page title="Все операции" subtitle="Полная история доходов и расходов"><div className="toolbar"><div className="search-box"><Search size={17}/><input placeholder="Поиск по названию или категории" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button onClick={() => setQuery('')}><X size={15}/></button>}</div><div className="filters">{([['all','Все'],['expense','Расходы'],['income','Доходы']] as const).map(([key,label]) => <button className={filter === key ? 'active' : ''} onClick={() => setFilter(key)} key={key}>{label}</button>)}</div><button className="primary" onClick={() => setModal({ type: 'transaction', kind: 'expense' })}><Plus size={18}/> Добавить</button></div><TransactionList items={shownTransactions} onDelete={removeTx}/></Page>}
      {active === 'Платежи' && <Page title="Регулярные платежи" subtitle="Обязательные расходы, которые не должны стать сюрпризом"><div className="page-actions"><button className="primary" onClick={() => setModal({ type: 'recurring' })}><Plus size={18}/> Новый платеж</button></div><div className="recurring-list">{recurring.length ? recurring.map(item => <div className={`payment-row ${item.paid ? 'paid' : ''}`} key={item.id}><CalendarDays size={22}/><div><b>{item.title}</b><small>{item.category} · ежемесячно, {item.day} числа</small></div><strong>{money(item.amount)}</strong><div className="row-actions"><button onClick={() => setRecurring(v => v.map(x => x.id === item.id ? { ...x, paid: !x.paid } : x))}>{item.paid ? <Check size={15}/> : 'Отметить'}</button><button className="danger-icon" onClick={() => setRecurring(v => v.filter(x => x.id !== item.id))}><Trash2 size={15}/></button></div></div>) : <Empty text="Добавьте аренду, подписки и другие ежемесячные платежи"/>}</div></Page>}
      {active === 'Цели' && <Page title="Финансовые цели" subtitle="Копите осознанно и наблюдайте прогресс"><div className="page-actions"><button className="primary" onClick={() => setModal({ type: 'goal' })}><Plus size={18}/> Новая цель</button></div><div className="goals-grid">{goals.length ? goals.map(goal => <div className="goal-card" key={goal.id}><div className="goal-icon"><Target/></div><button className="danger-icon goal-delete" onClick={() => setGoals(v => v.filter(x => x.id !== goal.id))}><Trash2 size={15}/></button><h3>{goal.title}</h3><p>{money(goal.saved)} из {money(goal.target)}</p><div className="progress"><span style={{ width: `${Math.min(100, goal.saved / goal.target * 100)}%` }}/></div><div className="goal-bottom"><b>{Math.round(goal.saved / goal.target * 100)}%</b><button onClick={() => { const value = Number(prompt('Сколько добавить к цели?')); if (value > 0) setGoals(v => v.map(x => x.id === goal.id ? { ...x, saved: Math.min(x.target, x.saved + value) } : x)) }}>Пополнить</button></div></div>) : <Empty text="Создайте первую финансовую цель"/>}</div></Page>}
      {active === 'Настройки' && <Page title="Настройки" subtitle="Персонализация и управление вашими данными"><div className="settings-grid"><section><h3>Профиль и бюджет</h3><label>Ваше имя<input value={profile.name} onChange={e => setProfile(v => ({ ...v, name: e.target.value }))}/></label><label>Месячный лимит расходов<input type="number" min="0" value={profile.budget} onChange={e => setProfile(v => ({ ...v, budget: Number(e.target.value) }))}/></label></section><section><h3>Резервная копия</h3><p>Сохраните все данные в файл или восстановите их на другом устройстве.</p><div className="settings-actions"><button onClick={exportData}><Download size={17}/> Экспорт</button><button onClick={() => fileInput.current?.click()}><Upload size={17}/> Импорт</button><input ref={fileInput} hidden type="file" accept="application/json" onChange={e => importData(e.target.files?.[0])}/></div></section><section className="danger-zone"><h3>Удаление данных</h3><p>Операции, платежи и цели будут удалены безвозвратно.</p><button onClick={resetData}><Trash2 size={17}/> Очистить все данные</button></section></div></Page>}
    </main>

    <nav className="mobile-nav">{nav.slice(0, 4).map(([label, Icon]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => setActive(label)}><Icon size={20}/><span>{label}</span></button>)}</nav>
    <button className="fab" onClick={() => setModal({ type: 'transaction', kind: 'expense' })}><Plus/></button>
    {modal?.type === 'transaction' && <TransactionModal kind={modal.kind} close={() => setModal(null)} submit={data => { setTransactions(v => [{ ...data, id: Date.now(), createdAt: new Date().toISOString() }, ...v]); setModal(null); notify(data.kind === 'income' ? 'Доход добавлен' : 'Расход добавлен') }}/>}
    {modal?.type === 'recurring' && <RecurringModal close={() => setModal(null)} submit={data => { setRecurring(v => [{ ...data, id: Date.now(), paid: false }, ...v]); setModal(null); notify('Регулярный платеж добавлен') }}/>}
    {modal?.type === 'goal' && <GoalModal close={() => setModal(null)} submit={data => { setGoals(v => [{ ...data, id: Date.now() }, ...v]); setModal(null); notify('Цель создана') }}/>}
    {installPrompt && <button className="install-mobile" onClick={install}><Smartphone size={18}/> Установить приложение</button>}
    {needRefresh && <div className="update-banner"><span>Доступна новая версия AQSHA</span><button onClick={() => updateServiceWorker(true)}>Обновить</button><button onClick={() => setNeedRefresh(false)}><X size={16}/></button></div>}
    {!navigator.onLine && <div className="offline"><WifiOff size={16}/> Офлайн-режим</div>}
    {toast && <div className="toast">{toast}</div>}
  </div>
}

function Dashboard({ totals, budget, categories, recurring, transactions, openTx, setActive, togglePaid }: { totals: { income: number; expense: number; balance: number }; budget: number; categories: [string, number][]; recurring: Recurring[]; transactions: Transaction[]; openTx: (k: Kind) => void; setActive: (v: string) => void; togglePaid: (id: number) => void }) {
  return <><section className="balance-card"><div className="balance-top"><div><span className="muted-light">Общий баланс</span><h2>{money(totals.balance)}</h2><span className="balance-note">Доходы минус расходы</span></div><div className="balance-actions"><button onClick={() => openTx('income')}><ArrowDownLeft size={19}/> Доход</button><button onClick={() => openTx('expense')}><ArrowUpRight size={19}/> Расход</button></div></div><div className="balance-bottom"><div><span>Доходы</span><strong>{money(totals.income)}</strong></div><div><span>Расходы</span><strong>{money(totals.expense)}</strong></div><div className="mini-chart"><i/><i/><i/><i/><i/><i/><i/></div></div></section>
  <section className="content-grid"><div className="card spending-card"><div className="card-head"><div><p className="eyebrow">РАСХОДЫ</p><h3>{money(totals.expense)}</h3></div><Target size={22}/></div><div className="budget-row"><span>Лимит {money(budget)}</span><b>{budget ? Math.min(100, Math.round(totals.expense / budget * 100)) : 0}%</b></div><div className="progress"><span style={{ width: `${budget ? Math.min(100, totals.expense / budget * 100) : 0}%` }}/></div><div className="categories">{categories.slice(0, 6).map(([name, amount], i) => <div className="category" key={name}><span className="color" style={{ background: colors[i] }}/><span>{name}</span><b>{money(amount)}</b></div>)}</div>{!categories.length && <p className="hint">Добавьте первый расход, чтобы увидеть категории.</p>}</div>
  <div className="card recurring-card"><div className="card-head"><div><p className="eyebrow">РЕГУЛЯРНЫЕ ПЛАТЕЖИ</p><h3>Ближайшие</h3></div><button className="text-button" onClick={() => setActive('Платежи')}>Все платежи</button></div>{recurring.slice(0,3).map(item => { const Icon = categoryIcons[item.category] || CalendarDays; return <button className={`recurring-item ${item.paid ? 'paid' : ''}`} key={item.id} onClick={() => togglePaid(item.id)}><span className="transaction-icon"><Icon size={20}/></span><span className="item-info"><b>{item.title}</b><small>{item.paid ? 'Оплачено' : `${item.day} числа`}</small></span><strong>{money(item.amount)}</strong></button> })}</div></section>
  <section className="card transactions-card"><div className="card-head"><div><p className="eyebrow">ПОСЛЕДНИЕ ОПЕРАЦИИ</p><h3>История</h3></div><button className="text-button" onClick={() => setActive('Операции')}>Смотреть все</button></div><TransactionList items={transactions.slice(0,5)}/></section></>
}

function Page({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="page card"><div className="page-title"><p className="eyebrow">МОИ ФИНАНСЫ</p><h2>{title}</h2><p>{subtitle}</p></div>{children}</section> }
function Empty({ text }: { text: string }) { return <div className="empty"><Sparkles size={30}/><h3>Пока здесь пусто</h3><p>{text}</p></div> }
function TransactionList({ items, onDelete }: { items: Transaction[]; onDelete?: (id: number) => void }) { return <div className="transaction-list">{items.length ? items.map(t => { const Icon = categoryIcons[t.category] || CreditCard; return <div className="transaction" key={t.id}><span className={`transaction-icon ${t.kind}`}><Icon size={20}/></span><span className="item-info"><b>{t.title}</b><small>{t.category} · {dateLabel(t.createdAt)}</small></span><strong className={t.kind}>{t.kind === 'income' ? '+' : '−'} {money(t.amount)}</strong>{onDelete && <button className="danger-icon tx-delete" onClick={() => onDelete(t.id)}><Trash2 size={15}/></button>}</div> }) : <Empty text="Операции по вашему запросу не найдены"/>}</div> }

function ModalShell({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && close()}><div className="modal"><div className="modal-head"><div><p className="eyebrow">AQSHA</p><h2>{title}</h2></div><button type="button" className="icon-button" onClick={close}><X size={20}/></button></div>{children}</div></div> }
function TransactionModal({ kind, close, submit }: { kind: Kind; close: () => void; submit: (v: Omit<Transaction, 'id'|'createdAt'>) => void }) {
  const [type, setType] = useState(kind); const [amount, setAmount] = useState(''); const [title, setTitle] = useState(''); const [category, setCategory] = useState(type === 'income' ? 'Доход' : 'Продукты')
  return <ModalShell title={type === 'expense' ? 'Добавить расход' : 'Добавить доход'} close={close}><form onSubmit={e => { e.preventDefault(); if (+amount > 0 && title.trim()) submit({ kind: type, amount: +amount, title: title.trim(), category }) }}><div className="segmented"><button type="button" className={type === 'expense' ? 'active' : ''} onClick={() => { setType('expense'); setCategory('Продукты') }}>Расход</button><button type="button" className={type === 'income' ? 'active' : ''} onClick={() => { setType('income'); setCategory('Доход') }}>Доход</button></div><Field label="Сумма"><div className="amount-input"><input required autoFocus type="number" min="1" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"/><span>₸</span></div></Field><Field label="Название"><input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Например, продукты"/></Field><Field label="Категория"><select value={category} onChange={e => setCategory(e.target.value)}>{(type === 'income' ? incomeCategories : expenseCategories).map(x => <option key={x}>{x}</option>)}</select></Field><button className="submit">Сохранить операцию</button></form></ModalShell>
}
function RecurringModal({ close, submit }: { close: () => void; submit: (v: Omit<Recurring,'id'|'paid'>) => void }) { const [title,setTitle]=useState(''); const [amount,setAmount]=useState(''); const [day,setDay]=useState('1'); const [category,setCategory]=useState('Подписки'); return <ModalShell title="Новый регулярный платеж" close={close}><form onSubmit={e => { e.preventDefault(); if (+amount > 0 && title.trim()) submit({ title: title.trim(), amount: +amount, day: +day, category }) }}><Field label="Название"><input required autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Например, аренда"/></Field><Field label="Сумма"><input required type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)}/></Field><div className="form-grid"><Field label="День месяца"><input required type="number" min="1" max="31" value={day} onChange={e=>setDay(e.target.value)}/></Field><Field label="Категория"><select value={category} onChange={e=>setCategory(e.target.value)}>{['Дом','Связь','Подписки','Транспорт','Другое'].map(x=><option key={x}>{x}</option>)}</select></Field></div><button className="submit">Сохранить платеж</button></form></ModalShell> }
function GoalModal({ close, submit }: { close: () => void; submit: (v: Omit<Goal,'id'>) => void }) { const [title,setTitle]=useState(''); const [target,setTarget]=useState(''); const [saved,setSaved]=useState('0'); return <ModalShell title="Новая финансовая цель" close={close}><form onSubmit={e => { e.preventDefault(); if (+target > 0 && title.trim()) submit({ title: title.trim(), target: +target, saved: Math.max(0,+saved) }) }}><Field label="Название"><input required autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Например, отпуск"/></Field><Field label="Нужно накопить"><input required type="number" min="1" value={target} onChange={e=>setTarget(e.target.value)}/></Field><Field label="Уже накоплено"><input type="number" min="0" value={saved} onChange={e=>setSaved(e.target.value)}/></Field><button className="submit">Создать цель</button></form></ModalShell> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label>{label}{children}</label> }
