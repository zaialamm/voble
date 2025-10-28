/**
 * Update Voble Config
 * 
 * This script updates the global config ticket price.
 * 
 * Usage:
 *   npx ts-node scripts/update-config.ts
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
  const programId = new anchor.web3.PublicKey("86XhBCaTT5RdEeJKb6tHJ2tCoujhahsFFKpVkdHnaNvt");
  const idl = JSON.parse(fs.readFileSync("./target/idl/idl.json", "utf-8"));
  const program = new Program(idl, provider);
  const authority = provider.wallet.publicKey;

  console.log("🔧 Updating Voble Config...");
  console.log("📍 Program ID:", program.programId.toString());
  console.log("👤 Authority:", authority.toString());
  console.log("");

  const [globalConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("global_config_v2")],
    program.programId
  );

  try {
    // Check current config
    const currentConfig = await (program.account as any).globalConfig.fetch(globalConfigPda);
    console.log("📊 Current Config:");
    console.log("   Ticket Price:", currentConfig.ticketPrice.toString(), "lamports");
    console.log("");

    // Update ticket price to 0.001 SOL (1,000,000 lamports)
    const newTicketPrice = new anchor.BN(1_000_000);
    
    console.log("🔄 Updating ticket price to:", newTicketPrice.toString(), "lamports (0.001 SOL)");
    
    const tx = await program.methods
      .setConfig(
        newTicketPrice,  // new ticket price
        null            // keep paused state unchanged
      )
      .accounts({
        authority: authority,
      })
      .rpc();

    console.log("✅ Config updated!");
    console.log("   Transaction:", tx);
    console.log("");

    // Verify update
    const updatedConfig = await (program.account as any).globalConfig.fetch(globalConfigPda);
    console.log("📊 Updated Config:");
    console.log("   Ticket Price:", updatedConfig.ticketPrice.toString(), "lamports (0.001 SOL)");
    console.log("");
    console.log("🎉 Config update complete!");

  } catch (error) {
    console.error("❌ Error updating config:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
