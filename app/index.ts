import * as anchor from "@project-serum/anchor";
import { Token, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";

document.getElementById("test").onclick = testConnection;
document.getElementById("launch").onclick = launchInstructions;

const NETWORK_URL_KEY = "http://localhost:8899";

const connection = new anchor.web3.Connection(NETWORK_URL_KEY);

let userAccount: anchor.web3.Account;
let mintAuthority;

async function testConnection() {
  let { blockhash } = await connection.getRecentBlockhash();
  console.log(blockhash);
  console.log("Connected!");
}

async function launchInstructions() {
  userAccount = await newAccountWithLamports(connection, 5e9);

  mintAuthority = new anchor.web3.PublicKey(
    "3SNSMUA8SR8Dg9VZiq441kgrpUQtcNZgoQPRXvP5ZS5h"
  );

  console.log("mintAuthority", mintAuthority);

  try {
    const collateralToken = await Token.createMint(
      connection,
      userAccount,
      mintAuthority,
      mintAuthority,
      8,
      TOKEN_PROGRAM_ID
    );

    // await sleep(40000);

    const mintInfo = await collateralToken.getMintInfo();
    console.log("mintInfo", mintInfo);

    const userCollateralTokenAccount = await collateralToken.createAccount(
      userAccount.publicKey
    );

    console.log("collateralTokenAccount", userCollateralTokenAccount);
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
