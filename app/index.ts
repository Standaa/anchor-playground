import * as anchor from "@project-serum/anchor";

import idl from "./idl";

document.getElementById("test").onclick = testConnection;
document.getElementById("launch").onclick = launchInstructions;

const NETWORK_URL_KEY = "http://localhost:8899";
const PROGRAM_ID_KEY = "ChRhVvwJUAtktDxCH53AcvPNsySDxhLKmdJCuv8L6YW8";

const connection = new anchor.web3.Connection(NETWORK_URL_KEY);
const programId = new anchor.web3.PublicKey(PROGRAM_ID_KEY);

const opts: anchor.web3.ConfirmOptions = {
  preflightCommitment: "singleGossip",
  commitment: "finalized",
};

const seed = "testSeed";
let userAccount: anchor.web3.Account;
let userWallet: anchor.Wallet;
let counter: anchor.web3.PublicKey;
let provider: anchor.Provider;
let program: anchor.Program;

async function testConnection() {
  let { blockhash } = await connection.getRecentBlockhash();
  console.log(blockhash);

  console.log("success");
}

async function launchInstructions() {
  userAccount = await newAccountWithLamports(connection);
  userWallet = new anchor.Wallet(userAccount);
  provider = new anchor.Provider(connection, userWallet, opts);
  program = new anchor.Program(idl, programId, provider);

  counter = await anchor.web3.PublicKey.createWithSeed(
    userWallet.publicKey,
    seed,
    program.programId
  );

  console.log("userWallet", userAccount.publicKey.toBase58());
  console.log("Derived wallet (counter)", counter.toBase58());

  try {
    await program.rpc.create(provider.wallet.publicKey, {
      accounts: {
        counter: counter,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [userAccount],
      instructions: [
        await anchor.web3.SystemProgram.createAccountWithSeed({
          basePubkey: userWallet.publicKey,
          fromPubkey: userWallet.publicKey,
          lamports: 10e8,
          newAccountPubkey: counter,
          programId: program.programId,
          seed: seed,
          space: 8 + 128,
        }),
      ],
    });

    let counterAccount = await program.account.counter(counter);
    console.log("Derived Account after init & creation:", counterAccount);
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
