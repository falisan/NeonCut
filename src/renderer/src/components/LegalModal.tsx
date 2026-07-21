import React from 'react'
import { useStore } from '../state/store'

export const LegalModal: React.FC<{ forceOpen?: boolean; onClose?: () => void }> = ({ forceOpen, onClose }) => {
  const { settings, updateSetting } = useStore()

  const open = forceOpen ?? (settings ? !settings.legalNoticeSeen : false)
  if (!open) return null

  const dismiss = async (): Promise<void> => {
    if (onClose) {
      onClose()
      return
    }
    await updateSetting('legalNoticeSeen', true)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2 style={{ color: 'var(--red)', fontSize: 16, marginBottom: 12 }}>[AVISO LEGAL] 警告</h2>
        <p style={{ color: 'var(--text-main)', fontSize: 13, lineHeight: 1.6 }}>
          NEONCUT es una herramienta generica de descarga, igual que el propio yt-dlp: no aloja ni distribuye
          contenido de terceros. La responsabilidad de respetar los derechos de autor y los terminos de servicio
          de cada plataforma recae en la persona que usa la aplicacion.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.6, marginTop: 10 }}>
          Se recomienda usarla unicamente con contenido propio, de dominio publico o para el que se cuente con
          permiso explicito (referencia interna de produccion, b-roll autorizado o copias de seguridad de material
          propio).
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-primary" onClick={dismiss}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
