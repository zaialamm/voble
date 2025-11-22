import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as os from "os";
import { PublicKey } from "@solana/web3.js";

// Simple CLI args
// Usage examples:
//   npx ts-node scripts/finalize-period-and-entitlements.ts --type daily --period 2025-01-20
//   npx ts-node scripts/finalize-period-and-entitlements.ts --type weekly --period 2025-W03
//   npx ts-node scripts/finalize-period-and-entitlements.ts --type monthly --period 2025-01

type PeriodType = "daily" | "weekly" | "monthly";

function parseArgs(): { periodType: PeriodType; periodId: string } {
  const args = process.argv.slice(2);
  let periodType: PeriodType | undefined;
  let periodId: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--type" && args[i + 1]) {
      const t = args[i + 1] as PeriodType;
      periodType = t;
      i++;
    } else if (arg === "--period" && args[i + 1]) {
      periodId = args[i + 1];
      i++;
    }
  }

  if (!periodType) {
    throw new Error("Missing --type argument (daily|weekly|monthly)");
  }
  if (!periodId) {
    throw new Error("Missing --period argument, e.g. --period 2025-01-20");
  }

  return { periodType, periodId };
}

// PDA helpers (mirror on-chain seeds)
const SEEDS = {
  GLOBAL_CONFIG: "global_config_v2",
  LEADERBOARD: "leaderboard",
  DAILY_PERIOD: "daily_period",
  WEEKLY_PERIOD: "weekly_period",
  MONTHLY_PERIOD: "monthly_period",
  WINNER_ENTITLEMENT: "winner_entitlement",
} as const;

function getGlobalConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.GLOBAL_CONFIG, "utf8")],
    programId
  );
}

function getLeaderboardPda(
  programId: PublicKey,
  periodId: string,
  periodType: PeriodType
): [PublicKey, number] {
  const periodTypeByte =
    periodType === "daily" ? 0 : periodType === "weekly" ? 1 : 2;

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.LEADERBOARD, "utf8"),
      Buffer.from(periodId, "utf8"),
      Buffer.from(Uint8Array.of(periodTypeByte)),
    ],
    programId
  );
}

function getPeriodStatePda(
  programId: PublicKey,
  periodId: string,
  periodType: PeriodType
): [PublicKey, number] {
  const seed =
    periodType === "daily"
      ? SEEDS.DAILY_PERIOD
      : periodType === "weekly"
      ? SEEDS.WEEKLY_PERIOD
      : SEEDS.MONTHLY_PERIOD;

  return PublicKey.findProgramAddressSync(
    [Buffer.from(seed, "utf8"), Buffer.from(periodId, "utf8")],
    programId
  );
}

function getWinnerEntitlementPda(
  programId: PublicKey,
  winner: PublicKey,
  periodType: PeriodType,
  periodId: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.WINNER_ENTITLEMENT, "utf8"),
      winner.toBuffer(),
      Buffer.from(periodType, "utf8"),
      Buffer.from(periodId, "utf8"),
    ],
    programId
  );
}

async function main() {
  const { periodType, periodId } = parseArgs();

  // Connection & wallet (same pattern as other scripts)
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

  console.log("🚀 Finalizing period and creating entitlements");
  console.log("   Program:", program.programId.toString());
  console.log("   Authority:", authority.toString());
  console.log("   Period type:", periodType);
  console.log("   Period ID:", periodId);

  const [globalConfigPda] = getGlobalConfigPda(program.programId);
  const [leaderboardPda] = getLeaderboardPda(
    program.programId,
    periodId,
    periodType
  );
  const [periodStatePda] = getPeriodStatePda(
    program.programId,
    periodId,
    periodType
  );

  console.log("   Global config:", globalConfigPda.toString());
  console.log("   Leaderboard:", leaderboardPda.toString());
  console.log("   Period state:", periodStatePda.toString());

  // 1) Finalize leaderboard
  const periodTypeByte =
    periodType === "daily" ? 0 : periodType === "weekly" ? 1 : 2;

  console.log("\n🏁 Step 1: Finalize leaderboard...");
  try {
    const tx = await program.methods
      .finalizeLeaderboard(periodId, periodTypeByte)
      .accounts({
        leaderboard: leaderboardPda,
        globalConfig: globalConfigPda,
        authority,
      })
      .rpc();

    console.log("   ✅ Leaderboard finalized. Tx:", tx);
  } catch (err) {
    console.error("   ⚠️ Error finalizing leaderboard (may already be finalized):", err);
  }

  // 2) Finalize period (daily/weekly/monthly)
  console.log("\n📊 Step 2: Finalize period and calculate prizes...");
  try {
    let tx: string;
    if (periodType === "daily") {
      tx = await (program.methods as any)
        .finalizeDaily(periodId)
        .accounts({
          globalConfig: globalConfigPda,
          periodState: periodStatePda,
          dailyPrizeVault: PublicKey.findProgramAddressSync(
            [Buffer.from("daily_prize_vault", "utf8")],
            program.programId
          )[0],
          leaderboard: leaderboardPda,
          authority,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } else if (periodType === "weekly") {
      tx = await (program.methods as any)
        .finalizeWeekly(periodId)
        .accounts({
          globalConfig: globalConfigPda,
          periodState: periodStatePda,
          weeklyPrizeVault: PublicKey.findProgramAddressSync(
            [Buffer.from("weekly_prize_vault", "utf8")],
            program.programId
          )[0],
          leaderboard: leaderboardPda,
          authority,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } else {
      tx = await (program.methods as any)
        .finalizeMonthly(periodId)
        .accounts({
          globalConfig: globalConfigPda,
          periodState: periodStatePda,
          monthlyPrizeVault: PublicKey.findProgramAddressSync(
            [Buffer.from("monthly_prize_vault", "utf8")],
            program.programId
          )[0],
          leaderboard: leaderboardPda,
          authority,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    }

    console.log("   ✅ Period finalized. Tx:", tx);
  } catch (err) {
    console.error("   ❌ Error finalizing period:", err);
    throw err;
  }

  // 3) Fetch PeriodState to get winners and vault snapshot
  console.log("\n👑 Step 3: Fetch PeriodState and create entitlements...");
  const periodState: any = await (program.account as any).periodState.fetch(
    periodStatePda
  );

  const winners: string[] = periodState.winners.map((pk: PublicKey) =>
    pk.toString()
  );
  const vaultBalanceAtFinalization = new anchor.BN(
    periodState.vaultBalanceAtFinalization
  );

  console.log("   Winners:", winners);
  console.log(
    "   Vault balance at finalization:",
    vaultBalanceAtFinalization.toString(),
    "lamports"
  );

  // Recompute prize splits off-chain using same logic as on-chain
  const config: any = await (program.account as any).globalConfig.fetch(
    globalConfigPda
  );
  const winnerSplits: number[] = config.winnerSplits as number[]; // [u16;3] bps

  if (winnerSplits.length !== 3) {
    throw new Error("Invalid winnerSplits length (expected 3)");
  }

  const basisPointsTotal = new anchor.BN(10_000);
  const vault = vaultBalanceAtFinalization; // BN

  const firstBase = vault
    .mul(new anchor.BN(winnerSplits[0]))
    .div(basisPointsTotal);
  const second = vault
    .mul(new anchor.BN(winnerSplits[1]))
    .div(basisPointsTotal);
  const third = vault
    .mul(new anchor.BN(winnerSplits[2]))
    .div(basisPointsTotal);

  const distributed = firstBase.add(second).add(third);
  const remainder = vault.sub(distributed);

  const first = firstBase.add(remainder);

  const amounts: anchor.BN[] = [first, second, third];

  console.log("   Computed prize amounts:");
  console.log("     1st:", first.toString());
  console.log("     2nd:", second.toString());
  console.log("     3rd:", third.toString());

  // Create entitlements for each winner (up to 3)
  for (let i = 0; i < winners.length; i++) {
    const winnerPubkey = new PublicKey(winners[i]);
    const rank = i + 1;
    const amount = amounts[i];

    if (amount.lte(new anchor.BN(0))) {
      console.log(
        `   ⚠️ Skipping rank #${rank} (amount is zero or non-positive: ${amount.toString()})`
      );
      continue;
    }

    const [entitlementPda] = getWinnerEntitlementPda(
      program.programId,
      winnerPubkey,
      periodType,
      periodId
    );

    console.log(
      `\n   🎁 Creating entitlement for rank #${rank} (${winnerPubkey.toString()})...`
    );

    try {
      let tx: string;
      if (periodType === "daily") {
        tx = await (program.methods as any)
          .createDailyWinnerEntitlement(periodId, rank, amount)
          .accounts({
            globalConfig: globalConfigPda,
            periodState: periodStatePda,
            winnerEntitlement: entitlementPda,
            winner: winnerPubkey,
            authority,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
      } else if (periodType === "weekly") {
        tx = await (program.methods as any)
          .createWeeklyWinnerEntitlement(periodId, rank, amount)
          .accounts({
            globalConfig: globalConfigPda,
            periodState: periodStatePda,
            winnerEntitlement: entitlementPda,
            winner: winnerPubkey,
            authority,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
      } else {
        tx = await (program.methods as any)
          .createMonthlyWinnerEntitlement(periodId, rank, amount)
          .accounts({
            globalConfig: globalConfigPda,
            periodState: periodStatePda,
            winnerEntitlement: entitlementPda,
            winner: winnerPubkey,
            authority,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
      }

      console.log("      ✅ Entitlement created. Tx:", tx);
    } catch (err) {
      console.error("      ❌ Error creating entitlement:", err);
    }
  }

  console.log("\n✅ Flow complete: leaderboard finalized, period finalized, entitlements created.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
