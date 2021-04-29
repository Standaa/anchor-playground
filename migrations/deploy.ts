import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
const { web3, setProvider, workspace } = require("@project-serum/anchor");

module.exports = async function (provider) {
  setProvider(provider);

  const connection = provider.connection;
  const deployer = provider.wallet.payer;
  const poolProgram = workspace.AnchorPlayground;

  const ANCHOR_PLAYGROUND_SEED = Buffer.from("AnchorPlayground");

  await poolProgram.state.rpc.new({
    accounts: {},
  });

  // Create a PDA
  const [poolAuthority, nonce] = await web3.PublicKey.findProgramAddress(
    [ANCHOR_PLAYGROUND_SEED],
    poolProgram.programId,
  );

  // connection: Connection - connection The connection to use
  // payer: Account - payer Fee payer for transaction
  // mintAuthority: PublicKey - mintAuthority Account or multisig that will control minting
  // freezeAuthority: PublicKey - freezeAuthority Optional account or multisig that can freeze token accounts
  // decimals: number - decimals Location of the decimal place
  // programId: PublicKey - programId Optional token programId, uses the system programId by default

  const poolTokenMint: Token = await Token.createMint(
    connection,
    deployer,
    poolAuthority,
    poolAuthority,
    8,
    TOKEN_PROGRAM_ID,
  );

  const poolTokenAccount = await poolTokenMint.createAccount(poolAuthority);

  const tx = await poolProgram.state.rpc.initialize(
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

  console.log("poolAuthority", poolAuthority.toBase58());
  console.log("poolTokenMint pubkey", poolTokenMint.publicKey.toBase58());
  console.log("wallet publickey :", provider.wallet.publicKey.toBase58());
};
