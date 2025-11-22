/**
 * Initialize a leaderboard account for the specified period type.
 *
 * Usage examples:
 *   npx ts-node scripts/init-period-leaderboard.ts --type daily
 *   npx ts-node scripts/init-period-leaderboard.ts --type weekly --period 2025-W03
 *   npx ts-node scripts/init-period-leaderboard.ts --type monthly --period 2025-01
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as os from "os";

const PERIOD_TYPE_BYTES = {
  daily: 0,
  weekly: 1,
  monthly: 2,
} as const;

type PeriodType = keyof typeof PERIOD_TYPE_BYTES;

function getDefaultPeriodId(type: PeriodType): string {
  const now = new Date();

  if (type === "daily") {
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (type === "weekly") {
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor(
      (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
    );
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, "0")}`;
  }

  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`; // monthly
}

type ParsedArgs = {
  periodTypes: PeriodType[];
  periodIdOverride?: string;
};

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let periodType: PeriodType | "all" | undefined;
  let periodId: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--type" && args[i + 1]) {
      const maybeType = args[i + 1] as PeriodType | "all";
      periodType = maybeType;
      i++;
    } else if (arg === "--period" && args[i + 1]) {
      periodId = args[i + 1];
      i++;
    } else if (!arg.startsWith("--") && !periodId) {
      // Backwards compatible: allow positional period ID
      periodId = arg;
    }
  }

  if (!periodType) {
    throw new Error(
      "Missing --type argument (daily | weekly | monthly | all). Example: --type daily"
    );
  }

  if (periodType === "all" && periodId) {
    throw new Error("--period cannot be used with --type all. Initialize each type separately or omit --period.");
  }

  if (periodType === "all") {
    return { periodTypes: ["daily", "weekly", "monthly"], periodIdOverride: undefined };
  }

  const id = periodId ?? getDefaultPeriodId(periodType);
  return { periodTypes: [periodType], periodIdOverride: periodId ? id : undefined };
}

async function main() {
  const { periodTypes, periodIdOverride } = parseArgs();

  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const walletPath = `${os.homedir()}/.config/solana/id.json`;
  const walletKeypair = anchor.web3.Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync("./target/idl/idl.json", "utf-8"));
  const program = new Program(idl, provider);
  const authority = provider.wallet.publicKey;

  console.log("🚀 Initializing leaderboard(s)");
  console.log("   Program:", program.programId.toString());
  console.log("   Authority:", authority.toString());

  const [globalConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("global_config_v2")],
    program.programId
  );

  for (const periodType of periodTypes) {
    const periodId = periodIdOverride ?? getDefaultPeriodId(periodType);
    const periodTypeByte = PERIOD_TYPE_BYTES[periodType];

    console.log("\n🕒 Period:", periodType, periodId);

    const [leaderboardPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("leaderboard"),
        Buffer.from(periodId),
        Buffer.from([periodTypeByte]),
      ],
      program.programId
    );

    console.log("   Leaderboard PDA:", leaderboardPda.toString());

    const existing = await provider.connection.getAccountInfo(leaderboardPda);
    if (existing) {
      console.log("   ✅ Already initialized");
      continue;
    }

    try {
      const tx = await program.methods
        .initializePeriodLeaderboard(periodId, periodTypeByte)
        .accounts({
          leaderboard: leaderboardPda,
          globalConfig: globalConfigPda,
          authority,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("   ✅ Initialized (tx:", tx, ")");
    } catch (error) {
      console.error("   ❌ Error initializing leaderboard:", error);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
