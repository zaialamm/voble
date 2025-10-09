'use client'

import { usePrivy } from '@privy-io/react-auth'
import { Button } from '@/components/ui/button'

export function PrivyLoginButton() {
  const { ready, authenticated, login, logout, user } = usePrivy()

  if (!ready) {
    return <Button disabled>Loading...</Button>
  }

  if (authenticated) {
    return (
      <Button onClick={logout} variant="outline">
        {user?.wallet?.address 
          ? `${user.wallet.address.slice(0, 4)}...${user.wallet.address.slice(-4)}`
          : 'Sign Out'
        }
      </Button>
    )
  }

  return (
    <Button onClick={login}>
      Sign In
    </Button>
  )
}