import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { createMint, createAccount, mintTo, getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("powermoney", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Powermoney as Program;

  let mint: PublicKey;
  let creatorTokenAccount: PublicKey;
  let recipientTokenAccount: PublicKey;

  const recipient = Keypair.generate();
  const approverOne = Keypair.generate();
  const approverTwo = Keypair.generate();
  const jurorA = Keypair.generate();
  const jurorB = Keypair.generate();
  const jurorC = Keypair.generate();

  before(async () => {
    mint = await createMint(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      provider.wallet.publicKey,
      null,
      6,
    );

    creatorTokenAccount = await createAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      provider.wallet.publicKey,
    );

    recipientTokenAccount = await createAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      recipient.publicKey,
    );

    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      creatorTokenAccount,
      provider.wallet.publicKey,
      10_000_000_000,
    );

    // Airdrop to approvers and jurors
    for (const kp of [approverOne, approverTwo, jurorA, jurorB, jurorC]) {
      await provider.connection.requestAirdrop(kp.publicKey, 2e9);
    }
    // Wait for airdrops to confirm
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  function deriveVaultPda(id: Uint8Array): [PublicKey, PublicKey] {
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(id)],
      program.programId,
    );
    const [vaultAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault-authority"), vaultPda.toBuffer()],
      program.programId,
    );
    return [vaultPda, vaultAuthority];
  }

  it("happy path: create and release timelock", async () => {
    const id = Uint8Array.from(Array(32).fill(1));
    const [vaultPda, vaultAuthority] = deriveVaultPda(id);
    const vaultToken = await createAccount(provider.connection, (provider.wallet as anchor.Wallet).payer, mint, vaultAuthority);

    const now = Math.floor(Date.now() / 1000) - 1;
    const condition = { timeLock: { releaseTime: new anchor.BN(now), percentage: 100 } };

    await program.methods
      .createVault([...id], new anchor.BN(1_000_000), "Timelock payout", [condition])
      .accounts({
        creator: provider.wallet.publicKey,
        recipient: recipient.publicKey,
        vault: vaultPda,
        vaultAuthority,
        creatorTokenAccount,
        vaultTokenAccount: vaultToken,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .releaseTimeLock(0)
      .accounts({
        authority: provider.wallet.publicKey,
        vault: vaultPda,
        vaultAuthority,
        vaultTokenAccount: vaultToken,
        recipientTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const recipientBalance = await getAccount(provider.connection, recipientTokenAccount);
    expect(Number(recipientBalance.amount)).to.be.greaterThan(0);
  });

  it("edge: rejects invalid percentages", async () => {
    const id = Uint8Array.from(Array(32).fill(2));
    const [vaultPda, vaultAuthority] = deriveVaultPda(id);
    const vaultToken = await createAccount(provider.connection, (provider.wallet as anchor.Wallet).payer, mint, vaultAuthority);

    const now = Math.floor(Date.now() / 1000) + 60;
    const badCondition = { timeLock: { releaseTime: new anchor.BN(now), percentage: 80 } };

    try {
      await program.methods
        .createVault([...id], new anchor.BN(1_000_000), "Bad percentages", [badCondition])
        .accounts({
          creator: provider.wallet.publicKey,
          recipient: recipient.publicKey,
          vault: vaultPda,
          vaultAuthority,
          creatorTokenAccount,
          vaultTokenAccount: vaultToken,
          mint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("expected createVault to fail");
    } catch (error) {
      expect((error as Error).message).to.contain("Invalid percentages");
    }
  });

  it("milestone approval flow releases after all approvals", async () => {
    const id = Uint8Array.from(Array(32).fill(3));
    const [vaultPda, vaultAuthority] = deriveVaultPda(id);
    const vaultToken = await createAccount(provider.connection, (provider.wallet as anchor.Wallet).payer, mint, vaultAuthority);

    const milestoneCondition = {
      milestoneApproval: {
        description: "Complete delivery",
        requiredApprovers: [approverOne.publicKey, approverTwo.publicKey],
        approvalsReceived: [],
        percentage: 100,
        completed: false,
      },
    };

    await program.methods
      .createVault([...id], new anchor.BN(1_000_000), "Milestone vault", [milestoneCondition])
      .accounts({
        creator: provider.wallet.publicKey,
        recipient: recipient.publicKey,
        vault: vaultPda,
        vaultAuthority,
        creatorTokenAccount,
        vaultTokenAccount: vaultToken,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .approveMilestone(0)
      .accounts({
        approver: approverOne.publicKey,
        vault: vaultPda,
        vaultAuthority,
        vaultTokenAccount: vaultToken,
        recipientTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([approverOne])
      .rpc();

    await program.methods
      .approveMilestone(0)
      .accounts({
        approver: approverTwo.publicKey,
        vault: vaultPda,
        vaultAuthority,
        vaultTokenAccount: vaultToken,
        recipientTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([approverTwo])
      .rpc();

    const recipientBalance = await getAccount(provider.connection, recipientTokenAccount);
    expect(Number(recipientBalance.amount)).to.be.greaterThan(1_000_000);
  });

  it("auto split distributes to multiple recipients", async () => {
    const id = Uint8Array.from(Array(32).fill(4));
    const [vaultPda, vaultAuthority] = deriveVaultPda(id);
    const vaultToken = await createAccount(provider.connection, (provider.wallet as anchor.Wallet).payer, mint, vaultAuthority);

    const splitRecipientA = Keypair.generate();
    const splitRecipientB = Keypair.generate();
    const tokenA = await createAccount(provider.connection, (provider.wallet as anchor.Wallet).payer, mint, splitRecipientA.publicKey);
    const tokenB = await createAccount(provider.connection, (provider.wallet as anchor.Wallet).payer, mint, splitRecipientB.publicKey);

    const splitCondition = {
      autoSplit: {
        splits: [
          { wallet: splitRecipientA.publicKey, percentage: 60 },
          { wallet: splitRecipientB.publicKey, percentage: 40 },
        ],
      },
    };

    await program.methods
      .createVault([...id], new anchor.BN(1_000_000), "Split vault", [splitCondition])
      .accounts({
        creator: provider.wallet.publicKey,
        recipient: recipient.publicKey,
        vault: vaultPda,
        vaultAuthority,
        creatorTokenAccount,
        vaultTokenAccount: vaultToken,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .executeSplit(0)
      .accounts({
        authority: provider.wallet.publicKey,
        vault: vaultPda,
        vaultAuthority,
        vaultTokenAccount: vaultToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([
        { pubkey: tokenA, isSigner: false, isWritable: true },
        { pubkey: tokenB, isSigner: false, isWritable: true },
      ])
      .rpc();

    const balA = await getAccount(provider.connection, tokenA);
    const balB = await getAccount(provider.connection, tokenB);
    expect(Number(balA.amount)).to.equal(600_000);
    expect(Number(balB.amount)).to.equal(400_000);
  });

  it("cancel vault returns funds to creator", async () => {
    const id = Uint8Array.from(Array(32).fill(5));
    const [vaultPda, vaultAuthority] = deriveVaultPda(id);
    const vaultToken = await createAccount(provider.connection, (provider.wallet as anchor.Wallet).payer, mint, vaultAuthority);

    const beforeBalance = await getAccount(provider.connection, creatorTokenAccount);
    const depositAmount = 500_000;

    const condition = { timeLock: { releaseTime: new anchor.BN(Math.floor(Date.now() / 1000) + 9999), percentage: 100 } };

    await program.methods
      .createVault([...id], new anchor.BN(depositAmount), "Cancel test", [condition])
      .accounts({
        creator: provider.wallet.publicKey,
        recipient: recipient.publicKey,
        vault: vaultPda,
        vaultAuthority,
        creatorTokenAccount,
        vaultTokenAccount: vaultToken,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .cancelVault()
      .accounts({
        creator: provider.wallet.publicKey,
        vault: vaultPda,
        vaultAuthority,
        vaultTokenAccount: vaultToken,
        creatorTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const afterBalance = await getAccount(provider.connection, creatorTokenAccount);
    expect(Number(afterBalance.amount)).to.equal(Number(beforeBalance.amount));
  });

  it("dispute flow: raise, vote, resolve for plaintiff", async () => {
    const id = Uint8Array.from(Array(32).fill(6));
    const [vaultPda, vaultAuthority] = deriveVaultPda(id);
    const vaultToken = await createAccount(provider.connection, (provider.wallet as anchor.Wallet).payer, mint, vaultAuthority);

    const condition = { timeLock: { releaseTime: new anchor.BN(Math.floor(Date.now() / 1000) + 9999), percentage: 100 } };

    await program.methods
      .createVault([...id], new anchor.BN(1_000_000), "Dispute vault", [condition])
      .accounts({
        creator: provider.wallet.publicKey,
        recipient: recipient.publicKey,
        vault: vaultPda,
        vaultAuthority,
        creatorTokenAccount,
        vaultTokenAccount: vaultToken,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [disputePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dispute"), vaultPda.toBuffer()],
      program.programId,
    );

    await program.methods
      .raiseDispute("Non-delivery of goods", [jurorA.publicKey, jurorB.publicKey, jurorC.publicKey])
      .accounts({
        plaintiff: provider.wallet.publicKey,
        vault: vaultPda,
        dispute: disputePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Juror A votes for plaintiff
    await program.methods
      .voteDispute(true)
      .accounts({
        juror: jurorA.publicKey,
        vault: vaultPda,
        dispute: disputePda,
        vaultAuthority,
        vaultTokenAccount: vaultToken,
        creatorTokenAccount,
        recipientTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([jurorA])
      .rpc();

    // Juror B votes for plaintiff -> majority reached (2 of 3)
    await program.methods
      .voteDispute(true)
      .accounts({
        juror: jurorB.publicKey,
        vault: vaultPda,
        dispute: disputePda,
        vaultAuthority,
        vaultTokenAccount: vaultToken,
        creatorTokenAccount,
        recipientTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([jurorB])
      .rpc();

    // Creator (plaintiff) should have received funds back
    const creatorBalance = await getAccount(provider.connection, creatorTokenAccount);
    expect(Number(creatorBalance.amount)).to.be.greaterThan(0);
  });

  it("edge: unauthorized signer cannot approve milestone", async () => {
    const id = Uint8Array.from(Array(32).fill(7));
    const [vaultPda, vaultAuthority] = deriveVaultPda(id);
    const vaultToken = await createAccount(provider.connection, (provider.wallet as anchor.Wallet).payer, mint, vaultAuthority);

    const unauthorized = Keypair.generate();
    await provider.connection.requestAirdrop(unauthorized.publicKey, 2e9);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const milestoneCondition = {
      milestoneApproval: {
        description: "Delivery milestone",
        requiredApprovers: [approverOne.publicKey],
        approvalsReceived: [],
        percentage: 100,
        completed: false,
      },
    };

    await program.methods
      .createVault([...id], new anchor.BN(1_000_000), "Unauthorized test", [milestoneCondition])
      .accounts({
        creator: provider.wallet.publicKey,
        recipient: recipient.publicKey,
        vault: vaultPda,
        vaultAuthority,
        creatorTokenAccount,
        vaultTokenAccount: vaultToken,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    try {
      await program.methods
        .approveMilestone(0)
        .accounts({
          approver: unauthorized.publicKey,
          vault: vaultPda,
          vaultAuthority,
          vaultTokenAccount: vaultToken,
          recipientTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([unauthorized])
        .rpc();
      expect.fail("expected approveMilestone to fail for unauthorized signer");
    } catch (error) {
      expect((error as Error).message).to.contain("Unauthorized approver");
    }
  });

  it("edge: cannot release timelock before expiry", async () => {
    const id = Uint8Array.from(Array(32).fill(8));
    const [vaultPda, vaultAuthority] = deriveVaultPda(id);
    const vaultToken = await createAccount(provider.connection, (provider.wallet as anchor.Wallet).payer, mint, vaultAuthority);

    const futureTime = Math.floor(Date.now() / 1000) + 99999;
    const condition = { timeLock: { releaseTime: new anchor.BN(futureTime), percentage: 100 } };

    await program.methods
      .createVault([...id], new anchor.BN(1_000_000), "Early release test", [condition])
      .accounts({
        creator: provider.wallet.publicKey,
        recipient: recipient.publicKey,
        vault: vaultPda,
        vaultAuthority,
        creatorTokenAccount,
        vaultTokenAccount: vaultToken,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    try {
      await program.methods
        .releaseTimeLock(0)
        .accounts({
          authority: provider.wallet.publicKey,
          vault: vaultPda,
          vaultAuthority,
          vaultTokenAccount: vaultToken,
          recipientTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      expect.fail("expected releaseTimeLock to fail before expiry");
    } catch (error) {
      expect((error as Error).message).to.contain("Time lock has not expired");
    }
  });
});
