import { Provider, Program, web3, Idl, workspace, BN } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";
import Wallet from "@project-serum/sol-wallet-adapter";
import idl from "../target/idl/anchor_playground.json";

document.getElementById("connect").onclick = connectWallet;
document.getElementById("launch").onclick = launchInstructions;

const NETWORK_URL_KEY = "http://localhost:8899";
const PROVIDER_URL_KEY = "https://www.sollet.io";
const PROGRAM_ID_KEY = "GTsknv2JJodePTioUMyuJ1s7PtpT9sRjshx9wNqKcuWo";
const wallet = new Wallet(PROVIDER_URL_KEY, NETWORK_URL_KEY);
const connection = new web3.Connection(NETWORK_URL_KEY, "root");

const opts: web3.ConfirmOptions = {
  preflightCommitment: "singleGossip",
  commitment: "singleGossip",
};

const programId = new web3.PublicKey(PROGRAM_ID_KEY);

const provider = new Provider(connection, wallet, opts);
const poolProgram = new Program(idl as Idl, programId, provider);

const ANCHOR_PLAYGROUND_SEED = Buffer.from("AnchorPlayground");

async function connectWallet() {
  wallet.connect();
}

wallet.on("connect", () => {
  console.log("Connected to wallet ", wallet.publicKey.toBase58());
});

wallet.on("disconnect", () => {
  console.log("Disconnected from wallet");
});

async function launchInstructions() {
  const poolState = await poolProgram.state();
  const mintAddress: web3.PublicKey = poolState.poolTokenMint;

  console.log("mintAddress", mintAddress.toBase58());

  const associatedAddress = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mintAddress,
    wallet.publicKey,
  );

  /* Wallet is passed as an Account here. Any Tx call using the token instance will fail */
  //TODO: Replace by normal call when web3 supports being passed a Wallet Adapter interface
  const poolTokenMint = new Token(provider.connection, mintAddress, TOKEN_PROGRAM_ID, wallet);
  let userAssociatedTokenAddress;
  try {
    userAssociatedTokenAddress = await poolTokenMint.getAccountInfo(associatedAddress);
  } catch (e) {}

  if (!userAssociatedTokenAddress) {
    console.log("No associated address with user wallet");
    let tx = new web3.Transaction().add(
      Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mintAddress,
        associatedAddress, //Associated Address
        wallet.publicKey, //Owner
        wallet.publicKey, //Payer
      ),
    );

    let { blockhash } = await connection.getRecentBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    let signed = await wallet.signTransaction(tx);
    let txid = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(txid);
    console.log(txid);

    userAssociatedTokenAddress = await poolTokenMint.getAccountInfo(associatedAddress);
  }

  console.log("userAssociatedTokenAddress", userAssociatedTokenAddress.address.toBase58());

  const [poolAuthority, _nonce] = await web3.PublicKey.findProgramAddress(
    [ANCHOR_PLAYGROUND_SEED],
    poolProgram.programId,
  );

  const poolTokenAccount: web3.PublicKey = poolState.poolTokenAccount;

  console.log("poolAuthority", poolAuthority.toBase58());
  console.log("poolTokenAccount", poolTokenAccount.toBase58());
  console.log("poolProgram", await poolProgram.state());

  // //@ts-expect-error
  // await poolProgram.state.rpc.sayHello({ accounts: {} });

  //@ts-expect-error
  await poolProgram.state.rpc.deposit(new BN(10e6), {
    accounts: {
      poolTokenMintAuthority: poolAuthority,
      poolTokenAccount: poolTokenAccount,
      userAssociatedTokenAccount: userAssociatedTokenAddress.address,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });
  // console.log(tx);

  //@ts-expect-error
  const tx = await poolProgram.state.rpc.withdraw(new BN(10), {
    accounts: {
      poolTokenMintAuthority: poolAuthority,
      poolTokenAccount: poolTokenAccount,
      userAssociatedTokenAccount: userAssociatedTokenAddress.address,
      tokenProgram: TOKEN_PROGRAM_ID,
      authority: wallet.publicKey,
    },
  });
  console.log(tx);
}

// export async function newAccountWithLamports(
//   connection: web3.Connection,
//   lamports = 50e8,
// ): Promise<web3.Account> {
//   const account = new web3.Account();

//   let retries = 30;

//   console.log(`Request Airdrop...`);
//   await connection.requestAirdrop(account.publicKey, lamports);

//   while (true) {
//     await sleep(500);
//     if (lamports == (await connection.getBalance(account.publicKey))) {
//       console.log(`Airdrop finished after ${retries} retries`);
//       return account;
//     }
//     if (--retries <= 0) {
//       break;
//     }
//   }
//   throw new Error(`Airdrop of ${lamports} failed`);
// }

// export function sleep(ms: number): Promise<void> {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

export async function isInitialized(
  connection: web3.Connection,
  accountPubKey: web3.PublicKey,
): Promise<boolean> {
  const accountInfo = await connection.getAccountInfo(accountPubKey);
  console.log(accountInfo);
  return !!accountInfo;
}

export async function isSplAccountInitialized(mint: Token, address: web3.PublicKey) {
  const splAccountInfo = await mint.getAccountInfo(address);
  return !!splAccountInfo;
}
