"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { ReactQueryProvider } from '@/components/react-query-provider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        solanaClusters: [{
          name: 'devnet',
          rpcUrl: process.env.NEXT_PUBLIC_RPC_DEVNET || 'https://api.devnet.solana.com',
          
        }],
        embeddedWallets: {
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
        appearance: { 
          showWalletLoginFirst: true,
          walletChainType: "solana-only",
          walletList: ['phantom', 'solflare']
         },

        externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },
      }}
    >
      <ReactQueryProvider>
          {children}
      </ReactQueryProvider>
    </PrivyProvider> 
  );
}