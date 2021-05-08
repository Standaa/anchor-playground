import assert from "assert";
import { web3, workspace, setProvider, Provider, BN, Wallet } from "@project-serum/anchor";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";

describe("anchor-playground", () => {
  const provider = Provider.local();

  // Configure the client to use the local cluster.
  setProvider(provider);

  // Program for the tests.
  const program = workspace.AnchorPlayground;
  // @ts-expect-error
  const payer = provider.wallet.payer as web3.Account;

  const ANCHOR_PLAYGROUND_SEED = Buffer.from("AnchorPlayground");

  let poolAuthority: web3.PublicKey;
  let nonce: number;
  let poolTokenMint: Token;
  let poolTokenAccount: web3.PublicKey;
  let testTokenAccount: web3.PublicKey;
  let userAccount: web3.Account;
  let userWallet: Wallet;
  let userAssociatedAddress: web3.PublicKey;

  before(async () => {
    const [_poolAuthority, _nonce] = await web3.PublicKey.findProgramAddress(
      [ANCHOR_PLAYGROUND_SEED],
      program.programId,
    );

    poolAuthority = _poolAuthority;
    nonce = _nonce;

    poolTokenMint = await Token.createMint(
      provider.connection,
      payer,
      poolAuthority,
      null,
      8,
      TOKEN_PROGRAM_ID,
    );

    poolTokenAccount = await poolTokenMint.createAccount(poolAuthority);

    userAccount = await newAccountWithLamports(provider.connection);
    userWallet = new Wallet(userAccount);
    userAssociatedAddress = await poolTokenMint.createAssociatedTokenAccount(userWallet.publicKey);
    testTokenAccount = await poolTokenMint.createAssociatedTokenAccount(provider.wallet.publicKey);

    console.log("userWalletAddress :", userWallet.publicKey.toBase58());
    console.log("userAccount publicKey :", userAccount.publicKey.toBase58());
    console.log("userAssociatedAddress :", userAssociatedAddress.toBase58());
  });

  it("Initializes Pool correctly", async () => {
    await program.state.rpc.new({
      accounts: {},
    });

    const tx = await program.state.rpc.initialize(
      nonce,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      {
        accounts: {
          poolTokenMint: poolTokenMint.publicKey,
          poolTokenAccount: poolTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          poolTokenMintAuthority: poolAuthority,
        },
      },
    );

    const poolState = await program.state();

    assert.ok(poolState.nonce === nonce);
    assert.ok(poolState.signer.equals(provider.wallet.publicKey));
    assert.ok(poolState.authority.equals(provider.wallet.publicKey));
    assert.ok(poolState.poolTokenMint.equals(poolTokenMint.publicKey));

    const poolTokenAccountAfterMint = await poolTokenMint.getAccountInfo(poolTokenAccount);
    assert.ok(poolTokenAccountAfterMint.amount.toNumber() === 10e7);
  });

  it("Deposits from wallet to user account", async () => {
    const poolState = await program.state();
    const mintAddress: PublicKey = poolState.poolTokenMint;

    // Refetch the token instead of getting poolTokenMint directly
    const poolTokenMintAfterInit = new Token(
      provider.connection,
      mintAddress,
      TOKEN_PROGRAM_ID,
      payer,
    );

    await program.state.rpc.deposit(new BN(50000), {
      accounts: {
        poolTokenMintAuthority: poolAuthority,
        poolTokenAccount: poolTokenAccount,
        userAssociatedTokenAccount: testTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    const poolTokenAccountAfterDeposit = await poolTokenMintAfterInit.getAccountInfo(
      poolTokenAccount,
    );

    const userTokenAccountAfterDeposit = await poolTokenMintAfterInit.getAccountInfo(
      testTokenAccount,
    );

    console.log("poolTokenAccountAfterDeposit", poolTokenAccountAfterDeposit.amount.toNumber());
    console.log("userTokenAccountAfterDeposit", userTokenAccountAfterDeposit.amount.toNumber());

    assert.ok(poolTokenAccountAfterDeposit.amount.toNumber() === 99950000);
    assert.ok(userTokenAccountAfterDeposit.amount.toNumber() === 50000);
  });

  it("Withdraws from user account to wallet", async () => {
    const poolState = await program.state();
    const mintAddress: PublicKey = poolState.poolTokenMint;

    const poolTokenMintAfterInit = new Token(
      provider.connection,
      mintAddress,
      TOKEN_PROGRAM_ID,
      payer,
    );

    console.log("poolAuthority", poolAuthority.toBase58());
    console.log("poolTokenAccount", poolTokenAccount.toBase58());

    const tx = await program.state.rpc.withdraw(new BN(10), {
      accounts: {
        poolTokenMintAuthority: poolAuthority,
        poolTokenAccount: poolTokenAccount,
        userAssociatedTokenAccount: testTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        authority: provider.wallet.publicKey,
      },
    });
    console.log(tx);

    // const ix = await program.state.instruction.withdraw(new BN(10), {
    //   accounts: {
    //     poolTokenMintAuthority: poolAuthority,
    //     poolTokenAccount: poolTokenAccount,
    //     userAssociatedTokenAccount: userAssociatedAddress,
    //     tokenProgram: TOKEN_PROGRAM_ID,
    //     authority: userWallet.publicKey,
    //   },
    // });

    // let tx = new web3.Transaction().add(ix);

    // let { blockhash } = await provider.connection.getRecentBlockhash();
    // tx.recentBlockhash = blockhash;
    // tx.feePayer = provider.wallet.publicKey;
    // let signed = await userWallet.signTransaction(tx);
    // let txid = await provider.connection.sendRawTransaction(signed.serialize());
    // await provider.connection.confirmTransaction(txid);
    // console.log(txid);

    const poolTokenAccountAfterDeposit = await poolTokenMintAfterInit.getAccountInfo(
      poolTokenAccount,
    );
    const userTokenAccountAfterDeposit = await poolTokenMintAfterInit.getAccountInfo(
      userAssociatedAddress,
    );

    console.log("poolTokenAccountAfterWithdrawal", poolTokenAccountAfterDeposit.amount.toNumber());
    console.log("userTokenAccountAfterWithdrawal", userTokenAccountAfterDeposit.amount.toNumber());

    // assert.ok(counterAccount.authority.equals(provider.wallet.publicKey));
    // assert.ok(counterAccount.count.toNumber() === 0);
  });
});

export async function newAccountWithLamports(
  connection: web3.Connection,
  lamports = 50e8,
): Promise<web3.Account> {
  const account = new web3.Account();

  let retries = 30;

  console.log(`Request Airdrop...`);
  await connection.requestAirdrop(account.publicKey, lamports);

  while (true) {
    await sleep(500);
    if (lamports == (await connection.getBalance(account.publicKey))) {
      console.log(`Airdrop finished after ${retries} retries`);
      return account;
    }
    if (--retries <= 0) {
      break;
    }
  }
  throw new Error(`Airdrop of ${lamports} failed`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
