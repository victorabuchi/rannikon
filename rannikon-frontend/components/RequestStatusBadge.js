import { useLanguage } from '@/lib/i18n'

export default function RequestStatusBadge({ status }) {
  const { t } = useLanguage()

  const style = {
    pending_housemaster: { bg: '#fff3e0', text: '#e65100', border: '#ffcc80', label: t('requests.statusPendingHousemaster') },
    pending_admin: { bg: '#e3f2fd', text: '#1565c0', border: '#90caf9', label: t('requests.statusPendingAdmin') },
    approved: { bg: '#e8f5e9', text: '#2d6a2d', border: '#a5d6a7', label: t('requests.statusApproved') },
    rejected: { bg: '#fdecea', text: '#c0392b', border: '#f5c6c6', label: t('requests.statusRejected') },
  }[status] || { bg: '#f3f3f3', text: '#666', border: '#ddd', label: status }

  return (
    <span style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}`, padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
      {style.label}
    </span>
  )
}
