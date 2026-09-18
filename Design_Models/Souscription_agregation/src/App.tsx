import { useState, useMemo } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────
type EchSt = 'payee' | 'impayee' | 'en_attente' | 'a_venir'
type Sit = 'active' | 'suspendue' | 'annulee' | 'terminee'
type PaySt = 'a_jour' | 'en_attente' | 'partielle' | 'impayee'
type ViewMode = 'souscriptions' | 'collaborateur'
type MainTab = 'offres' | 'souscriptions' | 'paiements'
type Filter = 'toutes' | 'actives' | 'impayees' | 'terminees' | 'annulees'

interface Echeance { id: number; debut: string; fin: string; montant: string; statut: EchSt; datePaiement?: string }
interface Sub {
  id: number; collabId: number; collabNom: string
  offre: string; tarif: string; periodicite: string
  renouvellement: 'Auto' | 'Manuel'; depuis: string; jusqua?: string
  situation: Sit; paiement: PaySt
  prochaineEcheance?: string; montantRestant?: string
  echeances: Echeance[]
}

// ─── Data ─────────────────────────────────────────────────────────────────
const SUBS: Sub[] = [
  { id:1, collabId:1, collabNom:'Articho', offre:'ABO-Premium Mensuel', tarif:'8 000 Ar', periodicite:'Mensuel · 1 mois', renouvellement:'Auto', depuis:'01/09/2026', situation:'active', paiement:'impayee', prochaineEcheance:'30/09/2026', montantRestant:'8 000 Ar restant', echeances:[
    {id:1,debut:'01/07/2026',fin:'31/07/2026',montant:'8 000 Ar',statut:'payee',datePaiement:'03/07/2026'},
    {id:2,debut:'01/08/2026',fin:'31/08/2026',montant:'8 000 Ar',statut:'payee',datePaiement:'02/08/2026'},
    {id:3,debut:'01/09/2026',fin:'30/09/2026',montant:'8 000 Ar',statut:'impayee'},
    {id:4,debut:'01/10/2026',fin:'31/10/2026',montant:'8 000 Ar',statut:'a_venir'},
  ]},
  { id:2, collabId:1, collabNom:'Articho', offre:'ABO-Standard Mensuel', tarif:'5 000 Ar', periodicite:'Mensuel · 1 mois', renouvellement:'Manuel', depuis:'01/06/2026', situation:'active', paiement:'a_jour', echeances:[
    {id:5,debut:'01/06/2026',fin:'30/06/2026',montant:'5 000 Ar',statut:'payee',datePaiement:'04/06/2026'},
    {id:6,debut:'01/07/2026',fin:'31/07/2026',montant:'5 000 Ar',statut:'payee',datePaiement:'03/07/2026'},
    {id:7,debut:'01/08/2026',fin:'31/08/2026',montant:'5 000 Ar',statut:'payee',datePaiement:'02/08/2026'},
    {id:8,debut:'01/09/2026',fin:'30/09/2026',montant:'5 000 Ar',statut:'en_attente'},
  ]},
  { id:3, collabId:1, collabNom:'Articho', offre:'ABO-Formation', tarif:'20 000 Ar', periodicite:'Unique', renouvellement:'Manuel', depuis:'05/06/2026', jusqua:'05/09/2026', situation:'terminee', paiement:'a_jour', echeances:[
    {id:9,debut:'05/06/2026',fin:'05/09/2026',montant:'20 000 Ar',statut:'payee',datePaiement:'05/06/2026'},
  ]},
  { id:4, collabId:2, collabNom:'Rakoto Jean', offre:'ABO-Standard Mensuel', tarif:'6 000 Ar', periodicite:'Mensuel · 1 mois', renouvellement:'Manuel', depuis:'14/07/2026', situation:'active', paiement:'a_jour', echeances:[
    {id:10,debut:'14/07/2026',fin:'14/08/2026',montant:'6 000 Ar',statut:'payee',datePaiement:'15/07/2026'},
    {id:11,debut:'14/08/2026',fin:'14/09/2026',montant:'6 000 Ar',statut:'payee',datePaiement:'15/08/2026'},
    {id:12,debut:'14/09/2026',fin:'14/10/2026',montant:'6 000 Ar',statut:'a_venir'},
  ]},
  { id:5, collabId:2, collabNom:'Rakoto Jean', offre:'ABO-Premium Mensuel', tarif:'8 000 Ar', periodicite:'Mensuel · 1 mois', renouvellement:'Auto', depuis:'14/06/2026', situation:'active', paiement:'en_attente', prochaineEcheance:'30/09/2026', montantRestant:'8 000 Ar restant', echeances:[
    {id:13,debut:'14/06/2026',fin:'14/07/2026',montant:'8 000 Ar',statut:'payee',datePaiement:'14/06/2026'},
    {id:14,debut:'14/07/2026',fin:'14/08/2026',montant:'8 000 Ar',statut:'payee',datePaiement:'14/07/2026'},
    {id:15,debut:'14/08/2026',fin:'14/09/2026',montant:'8 000 Ar',statut:'en_attente'},
  ]},
  { id:6, collabId:3, collabNom:'Miora Aina', offre:'ABO-Standard Mensuel', tarif:'6 000 Ar', periodicite:'Mensuel · 1 mois', renouvellement:'Auto', depuis:'14/06/2026', situation:'suspendue', paiement:'impayee', prochaineEcheance:'29/09/2026', montantRestant:'6 000 Ar restant', echeances:[
    {id:16,debut:'14/06/2026',fin:'14/07/2026',montant:'6 000 Ar',statut:'payee',datePaiement:'15/06/2026'},
    {id:17,debut:'14/07/2026',fin:'14/08/2026',montant:'6 000 Ar',statut:'payee',datePaiement:'15/07/2026'},
    {id:18,debut:'14/08/2026',fin:'14/09/2026',montant:'6 000 Ar',statut:'impayee'},
  ]},
  { id:7, collabId:4, collabNom:'Rasoa Marie', offre:'ABO-Pro Trimestriel', tarif:'20 000 Ar', periodicite:'Trimestriel · 3 mois', renouvellement:'Auto', depuis:'01/07/2026', situation:'active', paiement:'a_jour', prochaineEcheance:'31/12/2026', echeances:[
    {id:19,debut:'01/07/2026',fin:'30/09/2026',montant:'20 000 Ar',statut:'payee',datePaiement:'01/07/2026'},
    {id:20,debut:'01/10/2026',fin:'31/12/2026',montant:'20 000 Ar',statut:'a_venir'},
  ]},
  { id:8, collabId:5, collabNom:'Andry Fidy', offre:'ABO-Standard Mensuel', tarif:'5 000 Ar', periodicite:'Mensuel · 1 mois', renouvellement:'Auto', depuis:'01/04/2026', situation:'active', paiement:'en_attente', prochaineEcheance:'30/09/2026', montantRestant:'5 000 Ar restant', echeances:[
    {id:21,debut:'01/04/2026',fin:'30/04/2026',montant:'5 000 Ar',statut:'payee',datePaiement:'02/04/2026'},
    {id:22,debut:'01/05/2026',fin:'31/05/2026',montant:'5 000 Ar',statut:'payee',datePaiement:'02/05/2026'},
    {id:23,debut:'01/06/2026',fin:'30/06/2026',montant:'5 000 Ar',statut:'payee',datePaiement:'01/06/2026'},
    {id:24,debut:'01/07/2026',fin:'31/07/2026',montant:'5 000 Ar',statut:'payee',datePaiement:'02/07/2026'},
    {id:25,debut:'01/08/2026',fin:'31/08/2026',montant:'5 000 Ar',statut:'payee',datePaiement:'02/08/2026'},
    {id:26,debut:'01/09/2026',fin:'30/09/2026',montant:'5 000 Ar',statut:'en_attente'},
  ]},
  { id:9, collabId:5, collabNom:'Andry Fidy', offre:'ABO-Premium Mensuel', tarif:'8 000 Ar', periodicite:'Mensuel · 1 mois', renouvellement:'Auto', depuis:'01/01/2026', situation:'active', paiement:'en_attente', prochaineEcheance:'30/09/2026', montantRestant:'8 000 Ar restant', echeances:[
    {id:27,debut:'01/01/2026',fin:'31/01/2026',montant:'8 000 Ar',statut:'payee',datePaiement:'02/01/2026'},
    {id:28,debut:'01/02/2026',fin:'28/02/2026',montant:'8 000 Ar',statut:'payee',datePaiement:'02/02/2026'},
    {id:29,debut:'01/03/2026',fin:'31/03/2026',montant:'8 000 Ar',statut:'payee',datePaiement:'02/03/2026'},
    {id:30,debut:'01/09/2026',fin:'30/09/2026',montant:'8 000 Ar',statut:'en_attente'},
  ]},
]

// ─── Status config ────────────────────────────────────────────────────────
const ECH_CFG: Record<EchSt, { l: string; c: string; bg: string }> = {
  payee:      { l: 'Payée',      c: '#16a34a', bg: '#dcfce7' },
  impayee:    { l: 'Impayée',    c: '#dc2626', bg: '#fee2e2' },
  en_attente: { l: 'En attente', c: '#d97706', bg: '#fef3c7' },
  a_venir:    { l: 'À venir',    c: '#64748b', bg: '#f1f5f9' },
}
const SIT_CFG: Record<Sit, { l: string; c: string; bg: string }> = {
  active:    { l: 'Active',    c: '#16a34a', bg: '#dcfce7' },
  suspendue: { l: 'Suspendue', c: '#d97706', bg: '#fef3c7' },
  annulee:   { l: 'Annulée',   c: '#dc2626', bg: '#fee2e2' },
  terminee:  { l: 'Terminée',  c: '#64748b', bg: '#f1f5f9' },
}
const PAY_CFG: Record<PaySt, { l: string; c: string }> = {
  a_jour:     { l: 'À jour',     c: '#16a34a' },
  en_attente: { l: 'En attente', c: '#d97706' },
  partielle:  { l: 'Partielle',  c: '#d97706' },
  impayee:    { l: 'Impayée',    c: '#dc2626' },
}

// ─── Small components ─────────────────────────────────────────────────────
function Chev({ open }: { open: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"
      style={{ transform: open ? 'rotate(90deg)' : '', transition: 'transform .14s ease', flexShrink: 0 }}>
      <path d="M3.5 2L7.5 5.5 3.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Avatar({ name, size = 26 }: { name: string; size?: number }) {
  const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4']
  const col = palette[name.charCodeAt(0) % palette.length]
  const init = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: col, color: '#fff',
      fontSize: size * 0.38, fontWeight: 700, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0, letterSpacing: '0.02em',
    }}>{init}</div>
  )
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ color, background: bg, fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function RenewBadge({ r }: { r: 'Auto' | 'Manuel' }) {
  return <Badge label={r} color={r === 'Auto' ? '#2563eb' : '#64748b'} bg={r === 'Auto' ? '#eff6ff' : '#f1f5f9'} />
}

function SitBadge({ sit }: { sit: Sit }) {
  const c = SIT_CFG[sit]; return <Badge label={c.l} color={c.c} bg={c.bg} />
}

function EchBadge({ st }: { st: EchSt }) {
  const c = ECH_CFG[st]; return <Badge label={c.l} color={c.c} bg={c.bg} />
}

function PayLabel({ pst }: { pst: PaySt }) {
  const c = PAY_CFG[pst]
  return (
    <span style={{ color: c.c, fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
      {pst === 'a_jour' && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke={c.c} strokeWidth="1.5"/><path d="M3.5 6l1.7 1.7L8.5 4.5" stroke={c.c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )}
      {c.l}
    </span>
  )
}

// ─── Global paiement status for a collaborateur ───────────────────────────
function collabGlobalPay(subs: Sub[]): PaySt {
  if (subs.some(s => s.paiement === 'impayee')) return 'impayee'
  if (subs.some(s => s.paiement === 'en_attente' || s.paiement === 'partielle')) return 'en_attente'
  return 'a_jour'
}

// ─── Icons ────────────────────────────────────────────────────────────────
const IcoHome = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 6.5L8 2l6 4.5V14H10v-3H6v3H2V6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
const IcoBox = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M2 7h12M6 4V2M10 4V2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IcoCart = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 2h2l2 7h7l1.5-5H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="13" r="1" fill="currentColor"/><circle cx="12" cy="13" r="1" fill="currentColor"/></svg>
const IcoPeople = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M11 7c1.4 0 2.5 1.1 2.5 2.5M13.5 14c0-1.7-.9-3.2-2.3-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IcoUser = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IcoCard = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 6.5h13M4 10h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IcoDollar = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M8 4v8M6 6.5h3a1.5 1.5 0 010 3H7a1.5 1.5 0 010 3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IcoChart = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12L5 8l3 2 3-5 3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
const IcoCog = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M8 2v1.5M8 12.5V14M14 8h-1.5M3.5 8H2M12.2 3.8l-1 1M4.8 11.2l-1 1M12.2 12.2l-1-1M4.8 4.8l-1-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IcoWrench = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10.5 2a3.5 3.5 0 00-3.3 4.6L2.5 11.3a1.2 1.2 0 001.7 1.7l4.7-4.7A3.5 3.5 0 0010.5 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
const IcoMore = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="4" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="12" r="1.2" fill="currentColor"/></svg>
const IcoFilter = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 3h11M3.5 7h7M5.5 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
const IcoBell = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2a5 5 0 00-5 5v3l-1.5 2h13L14 10V7a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M7.5 14.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
const IcoSun = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M9 2v1.5M9 14.5V16M16 9h-1.5M3.5 9H2M13.7 4.3l-1 1M5.3 12.7l-1 1M13.7 13.7l-1-1M5.3 5.3l-1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
const IcoGear = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M9 1.5V3M9 15v1.5M16.5 9H15M3 9H1.5M14.6 3.4l-1.1 1.1M4.5 13.5l-1.1 1.1M14.6 14.6l-1.1-1.1M4.5 4.5L3.4 3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
const IcoPlus = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>

const NAV_ITEMS = [
  { icon: <IcoHome />, label: 'Dashboard' },
  { icon: <IcoBox />, label: 'Stock', sub: true },
  { icon: <IcoCart />, label: 'Ventes', sub: true },
  { icon: <IcoPeople />, label: 'Collaborateurs' },
  { icon: <IcoUser />, label: 'Clients' },
  { icon: <IcoCard />, label: 'Abonnements', active: true },
  { icon: <IcoDollar />, label: 'Finance', sub: true },
  { icon: <IcoChart />, label: 'Rapports' },
  { icon: <IcoCog />, label: 'Configuration', sub: true },
  { icon: <IcoWrench />, label: 'Outils Super-Admin' },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────
function Sidebar() {
  return (
    <aside style={{
      width: 192, minHeight: '100vh', background: '#0d1b2a',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      borderRight: '1px solid #1a2d40',
    }}>
      {/* Logo area */}
      <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid #1a2d40', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: 6, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '-0.5px' }}>P</div>
        <div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>PEJAA</div>
          <div style={{ color: '#64748b', fontSize: 10, fontWeight: 500 }}>Admin</div>
        </div>
      </div>
      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {NAV_ITEMS.map((item) => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 12px',
            background: item.active ? '#1d4ed8' : 'transparent',
            color: item.active ? '#fff' : '#64748b',
            fontSize: 13, fontWeight: item.active ? 600 : 400,
            cursor: 'pointer', userSelect: 'none',
            borderRadius: item.active ? 0 : 0,
            transition: 'background .1s',
          }}>
            <span style={{ opacity: item.active ? 1 : 0.7 }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.sub && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5 }}>
                <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        ))}
      </nav>
      {/* User */}
      <div style={{ padding: '12px', borderTop: '1px solid #1a2d40', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar name="Dev Lancs" size={28} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Dev Lancs</div>
          <div style={{ color: '#475569', fontSize: 10 }}>super_admin</div>
        </div>
      </div>
    </aside>
  )
}

// ─── Stats cards ──────────────────────────────────────────────────────────
function StatCard({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{label}</div>
      </div>
    </div>
  )
}

// ─── Échéance sub-row ─────────────────────────────────────────────────────
function EcheanceRow({ ech, indent }: { ech: Echeance; indent: number }) {
  const isPast = ech.statut === 'payee' || ech.statut === 'impayee'
  return (
    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #eef2f7' }}>
      <td colSpan={6} style={{ padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: indent, paddingRight: 16, paddingTop: 7, paddingBottom: 7 }}>
          {/* Indentation guide */}
          <div style={{ width: 1, height: 16, background: '#cbd5e1', flexShrink: 0, marginLeft: 4 }} />
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: '#94a3b8', flexShrink: 0 }}>
            <path d="M2 2v6h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {/* Period */}
          <span style={{ fontSize: 12, color: isPast ? '#475569' : '#0f172a', fontWeight: 500, whiteSpace: 'nowrap', minWidth: 160 }}>
            {ech.debut} <span style={{ color: '#94a3b8', fontWeight: 400 }}>→</span> {ech.fin}
          </span>
          {/* Montant */}
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500, minWidth: 80 }}>{ech.montant}</span>
          {/* Statut */}
          <EchBadge st={ech.statut} />
          {/* Date paiement */}
          {ech.datePaiement
            ? <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>payé le {ech.datePaiement}</span>
            : ech.statut === 'a_venir' ? <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>Prévue</span>
            : null
          }
        </div>
      </td>
    </tr>
  )
}

// ─── Sub row (Souscription) ───────────────────────────────────────────────
function SubRow({ sub, indent = 0, expandedSubs, toggleSub }: {
  sub: Sub; indent?: number
  expandedSubs: Set<number>
  toggleSub: (id: number) => void
}) {
  const open = expandedSubs.has(sub.id)
  const hasEch = sub.echeances.length > 0

  return (
    <>
      <tr
        onClick={() => hasEch && toggleSub(sub.id)}
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
          cursor: hasEch ? 'pointer' : 'default',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#f8fafc' }}
        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#ffffff' }}
      >
        {/* Col 1: Collaborateur */}
        <td style={{ padding: '10px 12px 10px 0', paddingLeft: indent || 16, width: '22%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {hasEch
              ? <span style={{ color: '#94a3b8', flexShrink: 0, display: 'flex' }}><Chev open={open} /></span>
              : <span style={{ width: 11, flexShrink: 0 }} />
            }
            {indent === 0 && (
              <>
                <Avatar name={sub.collabNom} size={24} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{sub.collabNom}</span>
              </>
            )}
          </div>
        </td>
        {/* Col 2: Offre */}
        <td style={{ padding: '10px 12px', width: '26%' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{sub.offre}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{sub.tarif} · {sub.periodicite}</div>
        </td>
        {/* Col 3: Contrat */}
        <td style={{ padding: '10px 12px', width: '20%' }}>
          <div style={{ fontSize: 12, color: '#0f172a' }}>Depuis le {sub.depuis}</div>
          {sub.jusqua
            ? <div style={{ fontSize: 11, color: '#64748b' }}>→ {sub.jusqua}</div>
            : <div style={{ fontSize: 11, color: '#64748b' }}>Sans date de fin</div>
          }
          <div style={{ marginTop: 3 }}>
            <RenewBadge r={sub.renouvellement} />
          </div>
        </td>
        {/* Col 4: Situation */}
        <td style={{ padding: '10px 12px', width: '16%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <SitBadge sit={sub.situation} />
            <PayLabel pst={sub.paiement} />
          </div>
        </td>
        {/* Col 5: Prochaine échéance */}
        <td style={{ padding: '10px 12px', width: '13%' }}>
          {sub.prochaineEcheance
            ? <>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{sub.prochaineEcheance}</div>
                {sub.montantRestant && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 1 }}>{sub.montantRestant}</div>}
              </>
            : <span style={{ color: '#cbd5e1', fontSize: 13 }}>—</span>
          }
        </td>
        {/* Col 6: Actions */}
        <td style={{ padding: '10px 8px', width: '3%', textAlign: 'center' }}>
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
            padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center',
          }} onClick={e => e.stopPropagation()}>
            <IcoMore />
          </button>
        </td>
      </tr>
      {/* Echeances */}
      {open && sub.echeances.map(ech => (
        <EcheanceRow key={ech.id} ech={ech} indent={indent > 0 ? indent + 20 : 36} />
      ))}
    </>
  )
}

// ─── Collaborateur group row ──────────────────────────────────────────────
function CollabRow({ collabId, collabNom, subs, expandedCollabs, toggleCollab, expandedSubs, toggleSub }: {
  collabId: number; collabNom: string; subs: Sub[]
  expandedCollabs: Set<number>; toggleCollab: (id: number) => void
  expandedSubs: Set<number>; toggleSub: (id: number) => void
}) {
  const open = expandedCollabs.has(collabId)
  const impayees = subs.filter(s => s.paiement === 'impayee').length
  const globalPay = collabGlobalPay(subs)

  return (
    <>
      <tr
        onClick={() => toggleCollab(collabId)}
        style={{
          background: '#eef3f9',
          borderBottom: '1px solid #dde5f0',
          cursor: 'pointer',
          borderLeft: '3px solid #3b82f6',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#e4ecf8' }}
        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#eef3f9' }}
      >
        <td colSpan={6} style={{ padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#3b82f6', display: 'flex' }}><Chev open={open} /></span>
            <Avatar name={collabNom} size={26} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{collabNom}</span>
            <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>{subs.length} souscription{subs.length > 1 ? 's' : ''}</span>
            {impayees > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fee2e2', padding: '1px 6px', borderRadius: 3 }}>
                {impayees} impayée{impayees > 1 ? 's' : ''}
              </span>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <PayLabel pst={globalPay} />
            </div>
          </div>
        </td>
      </tr>
      {open && subs.map(sub => (
        <CollabSubRow key={sub.id} sub={sub} expandedSubs={expandedSubs} toggleSub={toggleSub} />
      ))}
    </>
  )
}

// Sub row inside collab mode (level 1)
function CollabSubRow({ sub, expandedSubs, toggleSub }: { sub: Sub; expandedSubs: Set<number>; toggleSub: (id: number) => void }) {
  const open = expandedSubs.has(sub.id)
  const hasEch = sub.echeances.length > 0

  return (
    <>
      <tr
        onClick={() => hasEch && toggleSub(sub.id)}
        style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9', cursor: hasEch ? 'pointer' : 'default' }}
        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#f8fafc' }}
        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#ffffff' }}
      >
        {/* Indent col 1 */}
        <td style={{ padding: '9px 0 9px 32px', width: '22%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {hasEch
              ? <span style={{ color: '#94a3b8', display: 'flex' }}><Chev open={open} /></span>
              : <span style={{ width: 11 }} />
            }
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
              <RenewBadge r={sub.renouvellement} />
            </span>
          </div>
        </td>
        {/* Offre */}
        <td style={{ padding: '9px 12px', width: '26%' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{sub.offre}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{sub.tarif} · {sub.periodicite}</div>
        </td>
        {/* Contrat */}
        <td style={{ padding: '9px 12px', width: '20%' }}>
          <div style={{ fontSize: 12, color: '#0f172a' }}>Depuis le {sub.depuis}</div>
          {sub.jusqua
            ? <div style={{ fontSize: 11, color: '#64748b' }}>→ {sub.jusqua}</div>
            : <div style={{ fontSize: 11, color: '#94a3b8' }}>Sans date de fin</div>
          }
        </td>
        {/* Situation */}
        <td style={{ padding: '9px 12px', width: '16%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <SitBadge sit={sub.situation} />
            <PayLabel pst={sub.paiement} />
          </div>
        </td>
        {/* Prochaine échéance */}
        <td style={{ padding: '9px 12px', width: '13%' }}>
          {sub.prochaineEcheance
            ? <>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{sub.prochaineEcheance}</div>
                {sub.montantRestant && <div style={{ fontSize: 11, color: '#dc2626' }}>{sub.montantRestant}</div>}
              </>
            : <span style={{ color: '#cbd5e1' }}>—</span>
          }
        </td>
        {/* Actions */}
        <td style={{ padding: '9px 8px', textAlign: 'center' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px 4px', borderRadius: 4, display: 'inline-flex' }}
            onClick={e => e.stopPropagation()}>
            <IcoMore />
          </button>
        </td>
      </tr>
      {open && sub.echeances.map(ech => (
        <EcheanceRow key={ech.id} ech={ech} indent={52} />
      ))}
    </>
  )
}

// ─── Mobile card ──────────────────────────────────────────────────────────
function MobileSubCard({ sub, expanded, onToggle }: { sub: Sub; expanded: boolean; onToggle: () => void }) {
  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 8, overflow: 'hidden' }}>
      <div onClick={onToggle} style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Avatar name={sub.collabNom} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{sub.collabNom}</span>
            <SitBadge sit={sub.situation} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#334155', marginTop: 2 }}>{sub.offre}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{sub.tarif} · {sub.periodicite} · <span style={{ color: sub.renouvellement === 'Auto' ? '#2563eb' : '#64748b' }}>{sub.renouvellement}</span></div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PayLabel pst={sub.paiement} />
            {sub.prochaineEcheance && <span style={{ fontSize: 11, color: '#64748b' }}>Prochaine: {sub.prochaineEcheance}</span>}
          </div>
        </div>
        <span style={{ color: '#94a3b8', display: 'flex', flexShrink: 0, marginTop: 2 }}><Chev open={expanded} /></span>
      </div>
      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Échéances
          </div>
          {sub.echeances.map(ech => (
            <div key={ech.id} style={{ padding: '7px 14px', borderTop: '1px solid #eef2f7', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#475569', flex: 1 }}>{ech.debut} → {ech.fin}</span>
              <span style={{ fontSize: 12, color: '#64748b', minWidth: 64 }}>{ech.montant}</span>
              <EchBadge st={ech.statut} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Souscriptions tab ───────────────────────────────────────────────
function SouscriptionsTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('souscriptions')
  const [filter, setFilter] = useState<Filter>('toutes')
  const [expandedSubs, setExpandedSubs] = useState<Set<number>>(new Set())
  const [expandedCollabs, setExpandedCollabs] = useState<Set<number>>(new Set())

  const toggleSub = (id: number) => setExpandedSubs(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const toggleCollab = (id: number) => setExpandedCollabs(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  const filtered = useMemo(() => SUBS.filter(s => {
    if (filter === 'toutes') return true
    if (filter === 'actives') return s.situation === 'active'
    if (filter === 'impayees') return s.paiement === 'impayee'
    if (filter === 'terminees') return s.situation === 'terminee'
    if (filter === 'annulees') return s.situation === 'annulee'
    return true
  }), [filter])

  const collabs = useMemo(() => {
    const map = new Map<number, { id: number; nom: string; subs: Sub[] }>()
    filtered.forEach(s => {
      if (!map.has(s.collabId)) map.set(s.collabId, { id: s.collabId, nom: s.collabNom, subs: [] })
      map.get(s.collabId)!.subs.push(s)
    })
    return Array.from(map.values())
  }, [filtered])

  const counts: Record<Filter, number> = {
    toutes: SUBS.length,
    actives: SUBS.filter(s => s.situation === 'active').length,
    impayees: SUBS.filter(s => s.paiement === 'impayee').length,
    terminees: SUBS.filter(s => s.situation === 'terminee').length,
    annulees: SUBS.filter(s => s.situation === 'annulee').length,
  }

  const filterLabels: { key: Filter; label: string }[] = [
    { key: 'toutes', label: 'Toutes' },
    { key: 'actives', label: 'Actives' },
    { key: 'impayees', label: 'Impayées' },
    { key: 'terminees', label: 'Terminées' },
    { key: 'annulees', label: 'Annulées' },
  ]

  return (
    <div>
      {/* Filter chips + action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {filterLabels.map(({ key, label }) => {
          const active = filter === key
          return (
            <button key={key} onClick={() => setFilter(key)} style={{
              border: active ? 'none' : '1px solid #e2e8f0',
              borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600,
              background: active ? '#f59e0b' : '#fff',
              color: active ? '#fff' : '#475569',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all .1s',
            }}>
              {label}
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: active ? 'rgba(255,255,255,.25)' : '#f1f5f9',
                color: active ? '#fff' : '#64748b',
                padding: '1px 5px', borderRadius: 3,
              }}>{counts[key]}</span>
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <button style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 12px', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
          <IcoFilter /> Filtres
        </button>
        <button style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', borderRadius: 6, padding: '5px 14px', background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <IcoPlus /> Nouvelle souscription
        </button>
      </div>

      {/* View toggle */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
        padding: '10px 16px', marginBottom: 0,
        display: 'flex', alignItems: 'center', gap: 20, borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
        borderBottom: 'none',
      }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>Afficher par</span>
        {(['souscriptions', 'collaborateur'] as ViewMode[]).map(v => {
          const label = v === 'souscriptions' ? 'Souscription' : 'Collaborateur'
          const active = viewMode === v
          return (
            <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
              <input type="radio" name="viewMode" checked={active} onChange={() => setViewMode(v)} style={{ accentColor: '#f59e0b', width: 14, height: 14 }} />
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#0f172a' : '#64748b' }}>{label}</span>
            </label>
          )
        })}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block" style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              <th style={{ padding: '10px 0 10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', width: '22%' }}>
                {viewMode === 'souscriptions' ? 'Collaborateur' : 'Collaborateur / Offre'}
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', width: '26%' }}>Offre</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', width: '20%' }}>Contrat</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', width: '16%' }}>Situation</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', width: '13%' }}>Prochaine échéance</th>
              <th style={{ padding: '10px 8px', width: '3%' }} />
            </tr>
          </thead>
          <tbody>
            {viewMode === 'souscriptions'
              ? filtered.map(sub => (
                  <SubRow key={sub.id} sub={sub} expandedSubs={expandedSubs} toggleSub={toggleSub} />
                ))
              : collabs.map(c => (
                  <CollabRow
                    key={c.id} collabId={c.id} collabNom={c.nom} subs={c.subs}
                    expandedCollabs={expandedCollabs} toggleCollab={toggleCollab}
                    expandedSubs={expandedSubs} toggleSub={toggleSub}
                  />
                ))
            }
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>Lignes par page :</span>
          <select style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 6px', color: '#475569', background: '#fff' }}>
            <option>25</option><option>50</option><option>100</option>
          </select>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: '#64748b' }}>1–{filtered.length} sur {filtered.length} (1 / 1)</span>
          <button style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', background: '#fff', color: '#94a3b8', cursor: 'pointer' }}>‹</button>
          <button style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', background: '#fff', color: '#94a3b8', cursor: 'pointer' }}>›</button>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="block md:hidden" style={{ marginTop: 8 }}>
        {viewMode === 'souscriptions'
          ? filtered.map(sub => (
              <MobileSubCard
                key={sub.id} sub={sub}
                expanded={expandedSubs.has(sub.id)}
                onToggle={() => toggleSub(sub.id)}
              />
            ))
          : collabs.map(c => (
              <div key={c.id}>
                {/* Collab header card */}
                <div
                  onClick={() => toggleCollab(c.id)}
                  style={{ background: '#eef3f9', borderRadius: 8, border: '1px solid #dde5f0', borderLeft: '3px solid #3b82f6', padding: '11px 14px', marginBottom: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#3b82f6', display: 'flex' }}><Chev open={expandedCollabs.has(c.id)} /></span>
                  <Avatar name={c.nom} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{c.nom}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{c.subs.length} souscription{c.subs.length > 1 ? 's' : ''}</div>
                  </div>
                  <PayLabel pst={collabGlobalPay(c.subs)} />
                </div>
                {expandedCollabs.has(c.id) && (
                  <div style={{ paddingLeft: 16, marginBottom: 8 }}>
                    {c.subs.map(sub => (
                      <MobileSubCard
                        key={sub.id} sub={sub}
                        expanded={expandedSubs.has(sub.id)}
                        onToggle={() => toggleSub(sub.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
        }
      </div>
    </div>
  )
}

// ─── App shell ────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('souscriptions')

  const tabs: { key: MainTab; label: string; count: number }[] = [
    { key: 'offres',        label: 'Offres',        count: 6  },
    { key: 'souscriptions', label: 'Souscriptions', count: 11 },
    { key: 'paiements',     label: 'Paiements',     count: 20 },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f6' }}>
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <header style={{ background: '#0d1b2a', borderBottom: '1px solid #1a2d40', padding: '0 20px', height: 48, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>Abonnements</h1>
          <div style={{ flex: 1 }} />
          <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}><IcoSun /></button>
          <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}><IcoGear /></button>
          <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}><IcoBell /></button>
          <Avatar name="Dev Lancs" size={28} />
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '20px', overflowY: 'auto', minWidth: 0 }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <StatCard value={6}  label="Offres actives"     color="#22c55e" />
            <StatCard value={0}  label="Offres inactives"   color="#f97316" />
            <StatCard value={11} label="Souscriptions"      color="#f97316" />
            <StatCard value={8}  label="Échéances impayées" color="#ef4444" />
          </div>

          {/* Tab card */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '0 16px' }}>
              {tabs.map(t => {
                const active = activeTab === t.key
                return (
                  <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                    padding: '12px 14px', border: 'none', background: 'none',
                    borderBottom: active ? '2px solid #f59e0b' : '2px solid transparent',
                    color: active ? '#0f172a' : '#64748b',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    marginBottom: -1, transition: 'color .12s',
                  }}>
                    {t.label}
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                      background: active ? '#fef3c7' : '#f1f5f9',
                      color: active ? '#d97706' : '#94a3b8',
                    }}>{t.count}</span>
                  </button>
                )
              })}
              <div style={{ flex: 1 }} />
              <button style={{ margin: '8px 0', border: 'none', borderRadius: 6, padding: '6px 14px', background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <IcoPlus /> Nouvelle offre
              </button>
            </div>

            {/* Tab content */}
            <div style={{ padding: '16px' }}>
              {activeTab === 'souscriptions' && <SouscriptionsTab />}
              {activeTab === 'offres' && (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  Catalogue des offres disponibles
                </div>
              )}
              {activeTab === 'paiements' && (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  Historique des paiements
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
