import { useState } from 'react'
import AuthModal from './AuthModal'
import { setSession } from '../network/api'

type AuthMode = 'signin' | 'signup'

type AuthModalSuccess = {
  username?: string
}

export const useAuthModal = (options?: { onSuccess?: (payload: AuthModalSuccess) => void }) => {
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('signin')
  const [userName, setUserName] = useState<string>()

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode)
    setAuthOpen(true)
  }

  const onSignOut = () => {
    setSession(undefined)
    setUserName(undefined)
  }

  const modal = authOpen ? (
    <AuthModal
      mode={authMode}
      onClose={() => setAuthOpen(false)}
      onSuccess={(payload) => {
        if (payload.username) setUserName(payload.username)
        options?.onSuccess?.(payload)
      }}
    />
  ) : null

  return {
    userName,
    openAuth,
    onSignOut,
    modal,
    topbarProps: {
      onSignIn: () => openAuth('signin'),
      onSignUp: () => openAuth('signup'),
      onSignOut,
      userName,
    },
  }
}

