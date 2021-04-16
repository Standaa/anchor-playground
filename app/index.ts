import * as anchor from "@project-serum/anchor";
import { Idl } from "@project-serum/anchor";
import { Token, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";

import idlFile from "../target/idl/anchor_playground.json";

document.getElementById("test").onclick = testConnection;
document.getElementById("launch").onclick = launchInstructions;

const NETWORK_URL_KEY = "http://localhost:8899";
const PROGRAM_ID_KEY = "D6RGDud9LBRLY6pgjdzUehFttJpyLA85QAQoYQwzUUKZ";
const COLLATERAL_TOKEN_PUBKEY = "";

const connection = new anchor.web3.Connection(NETWORK_URL_KEY, "root");
const programId = new anchor.web3.PublicKey(PROGRAM_ID_KEY);

const seed = "testSeed";
const idl = idlFile as Idl;
let userAccount: anchor.web3.Account;
let userWallet: anchor.Wallet;
let userDerivedAddress: anchor.web3.PublicKey;
let provider: anchor.Provider;
let program: anchor.Program;
let mintAuthority;

async function testConnection() {
  let { blockhash } = await connection.getRecentBlockhash();
  console.log(blockhash);
  console.log("Connected!");
}

async function launchInstructions() {
  userAccount = await newAccountWithLamports(connection, 5e9);
  mintAuthority = await newAccountWithLamports(connection, 7e8);

  console.log("mintAuthority", mintAuthority);

  try {
    const collateralToken = await Token.createMint(
      connection,
      userAccount,
      mintAuthority.publicKey,
      null,
      8,
      TOKEN_PROGRAM_ID
    );

    const mintInfo = await collateralToken.getMintInfo();
    console.log("mintInfo", mintInfo);

    const userCollateralTokenAccount = await collateralToken.createAccount(
      userAccount.publicKey
    );

    const collateralAmount = new anchor.BN(5e8);

    const info = await collateralToken.mintTo(
      userCollateralTokenAccount, // dest
      mintAuthority.publicKey, // authority
      [mintAuthority], // multiSigners
      tou64(collateralAmount) // amount
    );

    console.log(info);

    console.log(
      "collateralTokenAccount",
      userCollateralTokenAccount.toBase58()
    );
  } catch (e) {
    console.log(e);
  }
}

export async function newAccountWithLamports(
  connection: anchor.web3.Connection,
  lamports = 50e8
): Promise<anchor.web3.Account> {
  const account = new anchor.web3.Account();

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

export async function isInitialized(
  connection: anchor.web3.Connection,
  accountPubKey: anchor.web3.PublicKey
): Promise<boolean> {
  const accountInfo = await connection.getAccountInfo(accountPubKey);
  console.log(accountInfo);
  return !!accountInfo;
}

export const tou64 = (amount) => {
  return new u64(amount.toString());
};

export const createToken = async ({
  connection,
  payingAccount,
  mintAuthority,
}) => {
  const token = await Token.createMint(
    connection,
    payingAccount,
    mintAuthority,
    null,
    8,
    TOKEN_PROGRAM_ID
  );
  return token;
};
