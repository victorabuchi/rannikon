import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import api from '../lib/api'
import { clearAuth } from '../lib/auth'
import { useLanguage } from '@/lib/i18n'
import LanguageSelector from '@/components/LanguageSelector'

const LOCALE_MAP = { en: 'en-GB', uk: 'uk-UA', km: 'km-KH', vi: 'vi-VN', ne: 'ne-NP' }

const HOUSE_GROUPS = ['Kivilinna/Salo', 'Karton Cambodia', 'Karton International', 'Vassila', 'Suppala', 'Salo/Turku']

const GROUP_COLORS = {
  'Kivilinna/Salo':      { bg: '#e8f5e9', text: '#1b5e20', border: '#a5d6a7' },
  'Karton Cambodia':     { bg: '#e3f2fd', text: '#0d47a1', border: '#90caf9' },
  'Karton International':{ bg: '#fff3e0', text: '#e65100', border: '#ffcc80' },
  'Vassila':             { bg: '#fce4ec', text: '#880e4f', border: '#f48fb1' },
  'Suppala':             { bg: '#f3e5f5', text: '#4a148c', border: '#ce93d8' },
  'Salo/Turku':          { bg: '#e0f7fa', text: '#006064', border: '#80deea' },
}

const ROLE_STYLE = {
  worker:      { bg: '#f5f5f5', text: '#555',     border: '#ddd' },
  supervisor:  { bg: '#e3f2fd', text: '#1565c0',  border: '#90caf9' },
  housemaster: { bg: '#f3e5f5', text: '#7b1fa2',  border: '#ce93d8' },
  admin:       { bg: '#e8f5e9', text: '#2d6a2d',  border: '#a5d6a7' },
}

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || ROLE_STYLE.worker
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
      {role}
    </span>
  )
}

function GroupPill({ group }) {
  const c = GROUP_COLORS[group]
  if (!c) return <span style={{ color: '#888', fontSize: '12px' }}>{group || '—'}</span>
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>
      {group}
    </span>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e3', borderRadius: '12px', padding: '14px 18px', minWidth: '110px', flex: 1 }}>
      <div style={{ fontSize: '10px', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: '800', color: accent || '#1a1a18' }}>{value ?? '—'}</div>
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const [me, setMe] = useState(null)
  const [tab, setTab] = useState('workers')
  const [stats, setStats] = useState(null)

  // Workers
  const [workers, setWorkers] = useState([])
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  // Invite modal
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', work_number: '', role: 'worker', house_group: '' })
  const [inviteSaving, setInviteSaving] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [copied, setCopied] = useState(false)

  // Supervisor logs
  const [logsDate, setLogsDate] = useState(new Date().toISOString().split('T')[0])
  const [grouped, setGrouped] = useState({})
  const [logsLoading, setLogsLoading] = useState(false)
  const [sentGroups, setSentGroups] = useState({})
  const [sendingGroup, setSendingGroup] = useState('')

  // Invitations
  const [invitations, setInvitations] = useState([])
  const [invLoading, setInvLoading] = useState(false)

  useEffect(() => {
    api.get('/api/auth/me').then(res => {
      const w = res.data.worker
      if (w?.role !== 'admin') { router.push('/dashboard'); return }
      setMe(w)
      loadStats()
      loadWorkers()
    }).catch(() => router.push('/login'))
  }, [])

  async function loadStats() {
    try {
      const res = await api.get('/api/admin/stats')
      setStats(res.data)
    } catch {}
  }

  async function loadWorkers() {
    try {
      const res = await api.get('/api/admin/workers')
      setWorkers(res.data.workers || [])
    } catch {}
  }

  async function loadLogs(date) {
    setLogsLoading(true)
    try {
      const res = await api.get('/api/admin/supervisor-logs/' + date)
      const g = {}
      HOUSE_GROUPS.forEach(grp => { g[grp] = res.data.grouped?.[grp] || [] })
      setGrouped(g)
      setSentGroups({})
    } catch {
      setGrouped({})
    } finally {
      setLogsLoading(false)
    }
  }

  async function loadInvitations() {
    setInvLoading(true)
    try {
      const res = await api.get('/api/admin/invitations')
      setInvitations(res.data.invitations || [])
    } catch {} finally {
      setInvLoading(false)
    }
  }

  function handleTabChange(t) {
    setTab(t)
    if (t === 'logs' && Object.keys(grouped).length === 0) loadLogs(logsDate)
    if (t === 'invitations' && invitations.length === 0) loadInvitations()
  }

  async function updateWorker(id, patch) {
    setUpdatingId(id)
    try {
      await api.patch('/api/admin/workers/' + id, patch)
      await loadWorkers()
      await loadStats()
    } catch {} finally {
      setUpdatingId(null)
    }
  }

  async function sendInvite() {
    setInviteError('')
    if (!inviteForm.role) { setInviteError(t('admin.roleRequired')); return }
    if (!inviteForm.email && !inviteForm.work_number) { setInviteError(t('admin.emailOrWorkNumberRequired')); return }
    setInviteSaving(true)
    try {
      const body = { ...inviteForm }
      if (inviteForm.role !== 'housemaster') delete body.house_group
      const res = await api.post('/api/admin/invite', body)
      setInviteUrl(res.data.register_url || '')
      setCopied(false)
    } catch (e) {
      setInviteError(e.response?.data?.error || t('admin.failedToSendInvitation'))
    } finally {
      setInviteSaving(false)
    }
  }

  function resetInviteModal() {
    setInviteForm({ email: '', work_number: '', role: 'worker', house_group: '' })
    setInviteUrl('')
    setInviteError('')
    setCopied(false)
    setShowInvite(false)
  }

  async function sendToHousemaster(group) {
    const logs = grouped[group] || []
    if (!logs.length) return
    setSendingGroup(group)
    try {
      await api.post('/api/admin/send-to-housemaster', { house_group: group, date: logsDate, logs })
      setSentGroups(s => ({ ...s, [group]: true }))
    } catch (e) {
      alert(e.response?.data?.error || t('sup.failedToSend'))
    } finally {
      setSendingGroup('')
    }
  }

  const filteredWorkers = workers.filter(w => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      w.full_name?.toLowerCase().includes(q) ||
      w.work_number?.toLowerCase().includes(q) ||
      w.email?.toLowerCase().includes(q)
    )
  })

  const inp = { width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'inherit', boxSizing: 'border-box' }

  if (!me) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
        <p style={{ color: '#555' }}>{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{t('admin.badge')} | Rannikon</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #f5f5f0; -webkit-font-smoothing: antialiased; }
        .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: inherit; transition: all 0.15s; }
        .btn-green { background: #2d6a2d; color: #fff; }
        .btn-green:hover { background: #235223; }
        .btn-outline { background: #fff; color: #333; border: 1px solid #ddd !important; }
        .btn-outline:hover { background: #f5f5f0; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .card { background: #fff; border: 1px solid #e8e8e3; border-radius: 14px; padding: 20px; }
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .modal { background: #fff; border-radius: 16px; padding: 28px; width: 100%; max-width: 460px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto; }
        input:focus, select:focus { outline: none; border-color: #2d6a2d !important; box-shadow: 0 0 0 3px rgba(45,106,45,0.1); }
        select { appearance: auto; }
        @media (max-width: 600px) { .admin-badge { display: none !important; } }
        .tbl-scroll { overflow-x: auto; }
        .tbl { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 640px; }
        .tbl th { padding: 9px 12px; text-align: left; font-weight: 700; font-size: 11px; color: #555; border-bottom: 2px solid #e8e8e3; white-space: nowrap; background: #fafafa; }
        .tbl td { padding: 9px 12px; border-bottom: 1px solid #f0f0ec; vertical-align: middle; }
        .tbl tbody tr:hover { background: #fafaf8; }
        .tab-btn { padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid #ddd; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
        .tab-active { background: #2d6a2d; color: #fff; border-color: #2d6a2d; }
        .tab-inactive { background: #fff; color: #555; }
        .tab-inactive:hover { background: #f5f5f0; }
      `}</style>

      {/* NAV */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <img src="/rannikkopuutarhalogo.png" alt="Rannikon" style={{ height: '46px', width: 'auto' }} />
            <span style={{ fontFamily: 'Dancing Script, cursive', fontWeight: '700', fontSize: '22px', color: '#2d6a2d', lineHeight: 1 }}>Rannikon Puutarha</span>
          </div>
          <span className="admin-badge" style={{ background: '#2d6a2d', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.5px' }}>{t('admin.badge')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#444', fontWeight: '500' }}>#{me.work_number} {me.full_name}</span>
          <button className="btn btn-outline" onClick={() => router.push('/dashboard')} style={{ fontSize: '12px', padding: '5px 12px' }}>{t('nav.myTimesheet')}</button>
          <button className="btn btn-outline" onClick={() => { clearAuth(); router.push('/login') }} style={{ fontSize: '12px', padding: '5px 12px' }}>{t('nav.signOut')}</button>
          <LanguageSelector />
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.4px', marginBottom: '2px' }}>{t('admin.panel')}</h1>
            <p style={{ fontSize: '13px', color: '#888' }}>{t('admin.subtitle')}</p>
          </div>
          <button className="btn btn-green" onClick={() => { setInviteUrl(''); setInviteError(''); setShowInvite(true) }} style={{ fontSize: '13px', padding: '9px 20px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t('admin.invite')}
          </button>
        </div>

        {/* STATS BAR */}
        {stats && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <StatCard label={t('admin.totalWorkers')} value={stats.total_workers} />
            <StatCard label={t('admin.active')} value={stats.active_workers} accent="#2d6a2d" />
            <StatCard label={t('admin.supervisors')} value={stats.total_supervisors} accent="#1565c0" />
            <StatCard label={t('admin.housemasters')} value={stats.total_housemasters} accent="#7b1fa2" />
            <StatCard label={t('admin.entriesToday')} value={stats.entries_today} accent="#b45309" />
          </div>
        )}

        {/* TAB NAV */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[['workers', t('admin.tabWorkers')], ['logs', t('admin.tabLogs')], ['invitations', t('admin.tabInvitations')]].map(([tabKey, l]) => (
            <button key={tabKey} className={`tab-btn ${tab === tabKey ? 'tab-active' : 'tab-inactive'}`} onClick={() => handleTabChange(tabKey)}>{l}</button>
          ))}
        </div>

        {/* WORKERS TAB */}
        {tab === 'workers' && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0ec', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                style={{ ...inp, maxWidth: '340px', flex: 1, padding: '9px 12px' }}
                placeholder={t('admin.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span style={{ fontSize: '13px', color: '#888' }}>{filteredWorkers.length} {t('admin.shown')}</span>
            </div>
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('housemaster.workNumberShort')}</th>
                    <th>{t('housemaster.name')}</th>
                    <th>{t('register.email')}</th>
                    <th>{t('admin.role')}</th>
                    <th>{t('sup.group')}</th>
                    <th>{t('admin.status')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#888' }}>{t('admin.noWorkersFound')}</td></tr>
                  )}
                  {filteredWorkers.map(w => (
                    <tr key={w.id}>
                      <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>#{w.work_number}</td>
                      <td style={{ fontWeight: '600' }}>{w.full_name}</td>
                      <td style={{ color: '#666', fontSize: '12px' }}>{w.email || '—'}</td>
                      <td><RoleBadge role={w.role} /></td>
                      <td><GroupPill group={w.house_group} /></td>
                      <td>
                        <span style={{ background: w.is_active ? '#e8f5e9' : '#fdecea', color: w.is_active ? '#2d6a2d' : '#c0392b', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', border: `1px solid ${w.is_active ? '#a5d6a7' : '#ffc1c0'}` }}>
                          {w.is_active ? t('admin.active') : t('admin.inactive')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <select
                            value={w.role}
                            disabled={updatingId === w.id}
                            onChange={e => updateWorker(w.id, { role: e.target.value })}
                            style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'inherit', cursor: 'pointer', color: '#333', background: '#fff' }}
                          >
                            <option value="worker">{t('admin.roleWorker')}</option>
                            <option value="supervisor">{t('admin.roleSupervisor')}</option>
                            <option value="housemaster">{t('admin.roleHousemaster')}</option>
                            <option value="admin">{t('admin.roleAdmin')}</option>
                          </select>
                          <button
                            disabled={updatingId === w.id}
                            onClick={() => updateWorker(w.id, { is_active: !w.is_active })}
                            style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', cursor: 'pointer', border: '1px solid #ddd', background: w.is_active ? '#fdecea' : '#e8f5e9', color: w.is_active ? '#c0392b' : '#2d6a2d', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                          >
                            {w.is_active ? t('admin.deactivate') : t('admin.activate')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUPERVISOR LOGS TAB */}
        {tab === 'logs' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '4px' }}>{t('papers.date')}</label>
                <input
                  type="date"
                  value={logsDate}
                  onChange={e => { setLogsDate(e.target.value); loadLogs(e.target.value) }}
                  style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'inherit' }}
                />
              </div>
              <button className="btn btn-outline" onClick={() => loadLogs(logsDate)} style={{ marginTop: '20px' }}>{t('housemaster.refresh')}</button>
            </div>

            {logsLoading && <p style={{ color: '#888', fontSize: '14px' }}>{t('common.loading')}</p>}

            {!logsLoading && HOUSE_GROUPS.map(group => {
              const rows = grouped[group] || []
              const isSending = sendingGroup === group
              const isSent = sentGroups[group]
              return (
                <div key={group} className="card" style={{ marginBottom: '16px', padding: 0 }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0ec', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <GroupPill group={group} />
                      <span style={{ fontSize: '13px', color: '#888', fontWeight: '600' }}>{rows.length} {rows.length !== 1 ? t('housemaster.workers') : t('housemaster.worker')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isSent && (
                        <span style={{ background: '#e8f5e9', color: '#2d6a2d', padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', border: '1px solid #c8e6c9', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          {t('admin.sent')}
                        </span>
                      )}
                      {!isSent && rows.length > 0 && (
                        <button className="btn btn-green" disabled={isSending} onClick={() => sendToHousemaster(group)} style={{ fontSize: '12px', padding: '6px 14px' }}>
                          {isSending ? t('auth.sending') : t('admin.sendToHousemaster')}
                        </button>
                      )}
                    </div>
                  </div>
                  {rows.length === 0 ? (
                    <p style={{ padding: '20px', color: '#bbb', fontSize: '13px', textAlign: 'center' }}>{t('admin.noLogsForGroup')}</p>
                  ) : (
                    <div className="tbl-scroll">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>{t('housemaster.workNumberShort')}</th>
                            <th>{t('housemaster.name')}</th>
                            <th>{t('papers.start')}</th>
                            <th>{t('papers.finish')}</th>
                            <th>{t('housemaster.breakShort')}</th>
                            <th>{t('housemaster.totalHrs')}</th>
                            <th>{t('housemaster.workDone')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => (
                            <tr key={r.id || i}>
                              <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>#{r.worker_number}</td>
                              <td>{r.worker_name || <span style={{ color: '#ccc' }}>{t('housemaster.unknown')}</span>}</td>
                              <td style={{ fontFamily: 'monospace' }}>{r.start_time?.slice(0,5) || ''}</td>
                              <td style={{ fontFamily: 'monospace' }}>{r.finish_time?.slice(0,5) || <span style={{ color: '#ccc' }}>{t('sup.pending')}</span>}</td>
                              <td style={{ color: '#b45309' }}>{r.total_break_mins > 0 ? r.total_break_mins + ' min' : ''}</td>
                              <td style={{ fontWeight: '700', color: '#2d6a2d' }}>{r.total_hours || ''}</td>
                              <td style={{ color: '#555' }}>{r.what_work || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* INVITATIONS TAB */}
        {tab === 'invitations' && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0ec', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700' }}>{t('admin.pendingInvitations')}</h2>
              <button className="btn btn-outline" onClick={loadInvitations} style={{ fontSize: '12px', padding: '5px 12px' }}>{t('housemaster.refresh')}</button>
            </div>
            {invLoading ? (
              <p style={{ padding: '24px', color: '#888', textAlign: 'center' }}>{t('common.loading')}</p>
            ) : (
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t('register.email')}</th>
                      <th>{t('housemaster.workNumberShort')}</th>
                      <th>{t('admin.role')}</th>
                      <th>{t('admin.invitedBy')}</th>
                      <th>{t('admin.created')}</th>
                      <th>{t('admin.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#888' }}>{t('admin.noInvitationsYet')}</td></tr>
                    )}
                    {invitations.map(inv => (
                      <tr key={inv.id}>
                        <td style={{ color: '#555' }}>{inv.email || <span style={{ color: '#ccc' }}>—</span>}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{inv.work_number || <span style={{ color: '#ccc' }}>—</span>}</td>
                        <td><RoleBadge role={inv.role} /></td>
                        <td style={{ color: '#666' }}>{inv.invited_by_name || '—'}</td>
                        <td style={{ color: '#888', fontSize: '12px' }}>{inv.created_at ? new Date(inv.created_at).toLocaleDateString(LOCALE_MAP[lang] || 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                        <td>
                          <span style={{ background: inv.accepted ? '#e8f5e9' : '#fff3e0', color: inv.accepted ? '#2d6a2d' : '#b45309', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', border: `1px solid ${inv.accepted ? '#a5d6a7' : '#ffcc80'}` }}>
                            {inv.accepted ? t('admin.accepted') : t('sup.pending')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* INVITE MODAL */}
      {showInvite && (
        <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) resetInviteModal() }}>
          <div className="modal">
            {!inviteUrl ? (
              <>
                <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '20px' }}>{t('admin.inviteSomeone')}</h3>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>{t('auth.emailAddress')} <span style={{ color: '#aaa', fontWeight: '400' }}>{t('sup.optional')}</span></label>
                  <input style={inp} type="email" placeholder="worker@example.com" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>{t('auth.workNumber')} <span style={{ color: '#aaa', fontWeight: '400' }}>{t('sup.optional')}</span></label>
                  <input style={inp} type="text" placeholder={t('admin.workNumberPlaceholder')} value={inviteForm.work_number} onChange={e => setInviteForm(f => ({ ...f, work_number: e.target.value }))} />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>{t('admin.role')}</label>
                  <select style={{ ...inp }} value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value, house_group: '' }))}>
                    <option value="worker">{t('admin.roleWorker')}</option>
                    <option value="supervisor">{t('admin.roleSupervisor')}</option>
                    <option value="housemaster">{t('admin.roleHousemaster')}</option>
                    <option value="admin">{t('admin.roleAdmin')}</option>
                  </select>
                </div>

                {inviteForm.role === 'housemaster' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>{t('admin.houseGroup')}</label>
                    <select style={{ ...inp }} value={inviteForm.house_group} onChange={e => setInviteForm(f => ({ ...f, house_group: e.target.value }))}>
                      <option value="">{t('admin.selectHouseGroup')}</option>
                      {HOUSE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                )}

                {inviteError && (
                  <div style={{ background: '#fdecea', border: '1px solid #ffc1c0', color: '#c0392b', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginBottom: '14px' }}>
                    {inviteError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline" onClick={resetInviteModal} style={{ flex: 1 }}>{t('sup.cancel')}</button>
                  <button className="btn btn-green" onClick={sendInvite} disabled={inviteSaving} style={{ flex: 2 }}>
                    {inviteSaving ? t('auth.sending') : t('admin.createInvitation')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: '36px', height: '36px', background: '#e8f5e9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800' }}>{t('admin.invitationCreated')}</h3>
                </div>
                <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>{t('admin.shareRegLink')}</p>
                <div style={{ background: '#f5f5f0', border: '1px solid #e0e0db', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', wordBreak: 'break-all', color: '#333', marginBottom: '12px', fontFamily: 'monospace' }}>
                  {inviteUrl}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button className="btn btn-outline" style={{ flex: 1, fontSize: '12px' }} onClick={() => { navigator.clipboard?.writeText(inviteUrl); setCopied(true) }}>
                    {copied ? t('admin.copied') : t('admin.copyLink')}
                  </button>
                </div>
                <button className="btn btn-green" style={{ width: '100%' }} onClick={resetInviteModal}>{t('admin.done')}</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
