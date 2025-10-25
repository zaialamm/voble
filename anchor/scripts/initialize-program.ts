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
  const programId = new anchor.web3.PublicKey("AC7J4h1rzxbm7Ey229X2rFxEse4CMJS5CkFpaTEyZMr");
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
      // Initialize with default values
      const ticketPrice = new anchor.BN(1_000_000); // 0.001 SOL (1 million lamports)
      const prizeSplitDaily = 3000;    // 30%
      const prizeSplitWeekly = 2500;   // 25%
      const prizeSplitMonthly = 2000;  // 20%
      const platformRevenueSplit = 2500; // 25%
      const winnerSplits = [5000, 3000, 2000]; // 50%, 30%, 20% for top 3 winners

      const tx = await program.methods
        .initializeGlobalConfig(
          ticketPrice,
          prizeSplitDaily,
          prizeSplitWeekly,
          prizeSplitMonthly,
          platformRevenueSplit,
          winnerSplits
        )
        .accounts({
          authority: authority,
        })
        .rpc();

      console.log("✅ Global Config initialized!");
      console.log("   Transaction:", tx);
      console.log("   Config PDA:", globalConfigPda.toString());
      console.log("   Ticket Price:", ticketPrice.toString(), "lamports (0.001 SOL)");
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

  try {
    // Check if vaults already exist by checking account info
    const dailyVaultInfo = await provider.connection.getAccountInfo(dailyVaultPda);
    
    if (dailyVaultInfo) {
      console.log("✅ Vaults already initialized!");
      console.log("   Daily Vault:", dailyVaultPda.toString());
      console.log("   Weekly Vault:", weeklyVaultPda.toString());
      console.log("   Monthly Vault:", monthlyVaultPda.toString());
      console.log("   Platform Vault:", platformVaultPda.toString());
    } else {
      const tx = await program.methods
        .initializeVaults()
        .accounts({
          authority: authority,
        })
        .rpc();

      console.log("✅ Vaults initialized!");
      console.log("   Transaction:", tx);
      console.log("   Daily Vault:", dailyVaultPda.toString());
      console.log("   Weekly Vault:", weeklyVaultPda.toString());
      console.log("   Monthly Vault:", monthlyVaultPda.toString());
      console.log("   Platform Vault:", platformVaultPda.toString());
    }
  } catch (error) {
    console.error("❌ Error initializing vaults:", error);
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
  console.log("");
  console.log("✅ Users can now create profiles and play games!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
