import { Provider, Program, web3, Idl, workspace } from "@project-serum/anchor";
import { Token, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";
import Wallet from "@project-serum/sol-wallet-adapter";
import idl from "../target/idl/anchor_playground.json";

document.getElementById("connect").onclick = connectWallet;
document.getElementById("launch").onclick = launchInstructions;

const NETWORK_URL_KEY = "http://localhost:8899";
const PROVIDER_URL_KEY = "https://www.sollet.io";
const PROGRAM_ID_KEY = "5qQCkVwvGtNh3TwGHffS5bg1SSonETMYUcYSU9ETphHk";
const wallet = new Wallet(PROVIDER_URL_KEY, NETWORK_URL_KEY);
const connection = new web3.Connection(NETWORK_URL_KEY, "root");

const opts: web3.ConfirmOptions = {
  preflightCommitment: "singleGossip",
  commitment: "singleGossip",
};

const programId = new web3.PublicKey(PROGRAM_ID_KEY);

const provider = new Provider(connection, wallet, opts);
const poolProgram = new Program(idl as Idl, programId, provider);

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
  console.log("User wallet address", wallet.publicKey.toBase58());

  const authority = poolProgram.provider.wallet.publicKey;
  console.log("authority", authority.toBase58());

  const associatedPoolAccount = await poolProgram.account.userAccount.associatedAddress(authority);

  const isUserAccountInitialized: boolean = await isInitialized(connection, associatedPoolAccount);

  if (!isUserAccountInitialized) {
    console.log("Account not initialized");

    await poolProgram.rpc.initializeUserAccount({
      accounts: {
        userAccount: associatedPoolAccount,
        authority,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
      },
    });
  } else {
    console.log("Account already initialized");
  }

  try {
  } catch (e) {
    console.log(e);
  }
}

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

export const tou64 = (amount) => {
  return new u64(amount.toString());
};

export const createToken = async ({ connection, payingAccount, mintAuthority }) => {
  const token = await Token.createMint(
    connection,
    payingAccount,
    mintAuthority,
    null,
    8,
    TOKEN_PROGRAM_ID,
  );
  return token;
};
