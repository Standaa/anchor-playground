import assert from "assert";
import { web3, workspace, setProvider, Provider, BN } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { sleep } from "../app";
// import { isInitialized, isSplAccountInitialized } from "../app";

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
    // await poolTokenMint.mintTo(poolTokenAccount, poolAuthority, [payer], 3000);
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

    console.log(tx);

    const poolState = await program.state();

    assert.ok(poolState.nonce === nonce);
    assert.ok(poolState.signer.equals(provider.wallet.publicKey));
    assert.ok(poolState.authority.equals(provider.wallet.publicKey));
    assert.ok(poolState.poolTokenMint.equals(poolTokenMint.publicKey));

    const poolTokenAccountAfterMint = await poolTokenMint.getAccountInfo(poolTokenAccount);
    console.log("poolTokenAccountAfterMint", poolTokenAccountAfterMint.amount.toNumber());

    assert.ok(poolTokenAccountAfterMint.amount.toNumber() === 1000);
  });

  it("Deposits to a user account", async () => {
    const poolState = await program.state();
    const mintAddress: PublicKey = poolState.poolTokenMint;

    // Refetch the token instead of getting poolTokenMint directly
    const poolTokenMintAfterInit = new Token(
      provider.connection,
      mintAddress,
      TOKEN_PROGRAM_ID,
      payer,
    );
    // const poolTokenMintAfterInit = poolTokenMint;

    // console.log("Supply", (await poolTokenMintAfterInit.getMintInfo()).supply.toNumber());

    const userWallet = new web3.Account();

    // const associatedUserAccount = await Token.getAssociatedTokenAddress(
    //   ASSOCIATED_TOKEN_PROGRAM_ID,
    //   TOKEN_PROGRAM_ID,
    //   mintAddress,
    //   userWallet.publicKey,
    // );

    console.log("userWallet", userWallet.publicKey.toBase58());
    // console.log("associatedUserAccount", associatedUserAccount.toBase58());

    // poolTokenMintAfterInit.createAssociatedTokenAccount

    const userAssociatedAddress = await poolTokenMintAfterInit.createAssociatedTokenAccount(
      userWallet.publicKey,
    );

    console.log("userAssociatedAddress", userAssociatedAddress.toBase58());

    console.log("poolAuthority", poolAuthority.toBase58());
    console.log("poolTokenAccount", poolTokenAccount.toBase58());

    const tx = await program.state.rpc.deposit(new BN(12), {
      accounts: {
        poolTokenMintAuthority: poolAuthority,
        poolTokenAccount: poolTokenAccount,
        userAssociatedTokenAccount: userAssociatedAddress,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    console.log(tx);

    const poolTokenAccountAfterDeposit = await poolTokenMintAfterInit.getAccountInfo(
      poolTokenAccount,
    );

    const userTokenAccountAfterDeposit = await poolTokenMintAfterInit.getAccountInfo(
      userAssociatedAddress,
    );

    console.log("poolTokenAccountAfterDeposit", poolTokenAccountAfterDeposit.amount.toNumber());
    console.log("userTokenAccountAfterDeposit", userTokenAccountAfterDeposit.amount.toNumber());

    // assert.ok(counterAccount.authority.equals(provider.wallet.publicKey));
    // assert.ok(counterAccount.count.toNumber() === 0);
    assert.ok(true);
  });
});
