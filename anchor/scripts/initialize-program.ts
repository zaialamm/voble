/**
 * Initialize Voble Program
 * 
 * This script initializes the global config and vaults for the Voble program.
 * Run this ONCE after deploying the program to devnet/mainnet.
 * 
 * Usage:
 *   npx ts-node scripts/initialize-program.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as os from "os";

async function main() {
  // Configure the client to use devnet
  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  // Load wallet from Solana CLI config (~/.config/solana/id.json)
  const walletPath = `${os.homedir()}/.config/solana/id.json`;
  const walletKeypair = anchor.web3.Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load IDL and create program
  const idl = JSON.parse(fs.readFileSync("./target/idl/idl.json", "utf-8"));
  const program = new Program(idl, provider);
  const authority = provider.wallet.publicKey;

  console.log("🚀 Initializing Voble Program...");
  console.log("📍 Program ID:", program.programId.toString());
  console.log("👤 Authority:", authority.toString());
  console.log("");

  // Step 1: Initialize Global Config
  console.log("Step 1: Initializing Global Config...");

  const [globalConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("global_config_v2")],
    program.programId
  );

  try {
    // Check if already initialized
    const existingConfig = await (program.account as any).globalConfig.fetchNullable(globalConfigPda);

    if (existingConfig) {
      console.log("✅ Global Config already initialized!");
      console.log("   Ticket Price:", existingConfig.ticketPrice.toString(), "lamports");
      console.log("   Authority:", existingConfig.authority.toString());
    } else {
      // USDC Devnet Mint
      const USDC_MINT = new anchor.web3.PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

      // Initialize with default values
      const ticketPrice = new anchor.BN(1_000_000); // 1 USDC (6 decimals)
      const prizeSplitDaily = 4000;    // 40%
      const prizeSplitWeekly = 3000;   // 30%
      const prizeSplitMonthly = 2000;  // 20%
      const platformRevenueSplit = 700; // 7%
      const luckyDrawSplit = 300; // 3%
      const winnerSplits = [5000, 3000, 2000]; // 50%, 30%, 20% for top 3 winners

      const tx = await program.methods
        .initializeGlobalConfig(
          ticketPrice,
          prizeSplitDaily,
          prizeSplitWeekly,
          prizeSplitMonthly,
          platformRevenueSplit,
          luckyDrawSplit,
          winnerSplits,
          USDC_MINT
        )
        .accounts({
          authority: authority,
        })
        .rpc();

      console.log("✅ Global Config initialized!");
      console.log("   Transaction:", tx);
      console.log("   Config PDA:", globalConfigPda.toString());
      console.log("   Ticket Price:", ticketPrice.toString(), "USDC (6 decimals)");
    }
  } catch (error) {
    console.error("❌ Error initializing global config:", error);
    throw error;
  }

  console.log("");

  // Step 2: Initialize Vaults
  console.log("Step 2: Initializing Prize Vaults...");

  const [dailyVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("daily_prize_vault")],
    program.programId
  );

  const [weeklyVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("weekly_prize_vault")],
    program.programId
  );

  const [monthlyVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("monthly_prize_vault")],
    program.programId
  );

  const [platformVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("platform_vault")],
    program.programId
  );

  const [luckyDrawVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("lucky_draw_vault")],
    program.programId
  );

  try {
    // Check if vaults already exist by checking account info
    const dailyVaultInfo = await provider.connection.getAccountInfo(dailyVaultPda);

    if (dailyVaultInfo) {
      console.log("✅ Vaults already initialized!");
      console.log("   Daily Vault:", dailyVaultPda.toString());
      console.log("   Weekly Vault:", weeklyVaultPda.toString());
      console.log("   Monthly Vault:", monthlyVaultPda.toString());
      console.log("   Platform Vault:", platformVaultPda.toString());
      console.log("   Lucky Draw Vault:", luckyDrawVaultPda.toString());
    } else {
      const tx = await program.methods
        .initializeVaults()
        .accounts({
          authority: authority,
          usdcMint: new anchor.web3.PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      console.log("✅ Vaults initialized!");
      console.log("   Transaction:", tx);
      console.log("   Daily Vault:", dailyVaultPda.toString());
      console.log("   Weekly Vault:", weeklyVaultPda.toString());
      console.log("   Monthly Vault:", monthlyVaultPda.toString());
      console.log("   Platform Vault:", platformVaultPda.toString());
      console.log("   Lucky Draw Vault:", luckyDrawVaultPda.toString());
    }
  } catch (error) {
    console.error("❌ Error initializing vaults:", error);
    throw error;
  }

  console.log("");

  console.log("Step 3: Initializing today's daily leaderboard...");

  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const todayPeriodId = `${year}-${month}-${day}`;

  const [todayDailyLeaderboardPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("leaderboard"),
      Buffer.from(todayPeriodId),
      Buffer.from([0]),
    ],
    program.programId
  );

  try {
    const leaderboardInfo = await provider.connection.getAccountInfo(
      todayDailyLeaderboardPda
    );

    if (leaderboardInfo) {
      console.log("✅ Daily leaderboard already initialized for period:", todayPeriodId);
      console.log("   Leaderboard PDA:", todayDailyLeaderboardPda.toString());
    } else {
      const tx = await program.methods
        .initializePeriodLeaderboard(todayPeriodId, 0)
        .accounts({
          leaderboard: todayDailyLeaderboardPda,
          globalConfig: globalConfigPda,
          authority,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Daily leaderboard initialized for period:", todayPeriodId);
      console.log("   Transaction:", tx);
      console.log("   Leaderboard PDA:", todayDailyLeaderboardPda.toString());
    }
  } catch (error) {
    console.error("❌ Error initializing daily leaderboard:", error);
    throw error;
  }

  console.log("");
  console.log("🎉 Voble Program Initialization Complete!");
  console.log("");
  console.log("📝 Summary:");
  console.log("   Program ID:", program.programId.toString());
  console.log("   Global Config:", globalConfigPda.toString());
  console.log("   Daily Vault:", dailyVaultPda.toString());
  console.log("   Weekly Vault:", weeklyVaultPda.toString());
  console.log("   Monthly Vault:", monthlyVaultPda.toString());
  console.log("   Platform Vault:", platformVaultPda.toString());
  console.log("   Lucky Draw Vault:", luckyDrawVaultPda.toString());
  console.log("   Daily Leaderboard (today):", todayDailyLeaderboardPda.toString());
  console.log("");
  console.log("✅ Users can now create profiles and play games!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
