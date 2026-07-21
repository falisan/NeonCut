import React from 'react'

interface Props {
  percent: number
  indeterminate?: boolean
}

export const ProgressBar: React.FC<Props> = ({ percent, indeterminate }) => (
  <div className="progress-track">
    {indeterminate ? (
      <div className="progress-fill progress-fill--indeterminate" />
    ) : (
      <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    )}
  </div>
)
