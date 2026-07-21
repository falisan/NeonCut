import React from 'react'

type Tone = 'cyan' | 'yellow' | 'green' | 'red'

export const StatusTag: React.FC<{ tone: Tone; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`status-tag status-tag--${tone}`}>{children}</span>
)
