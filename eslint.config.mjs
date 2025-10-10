import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Allow 'any' type in specific infrastructure/utility files where it's necessary
      // for working with external libraries (Anchor, Privy, etc.) that have complex types
      '@typescript-eslint/no-explicit-any': 'off',
    },
    files: [
      // Infrastructure files where 'any' is necessary for library interop
      'src/components/session-provider.tsx',
      'src/hooks/mb-er/use-commit-user-profile.ts',
      'src/hooks/mb-er/use-delegate-user-profile.ts',
      'src/hooks/mb-er/use-unified-session.ts',
      'src/hooks/web3-js/transaction-builder.ts',
      'src/hooks/web3-js/use-buy-ticket.ts',
      'src/hooks/web3-js/use-complete-game.ts',
      'src/hooks/web3-js/use-fetch-session.ts',
      'src/hooks/web3-js/use-initialize-profile.ts',
    ],
  },
]

export default eslintConfig
