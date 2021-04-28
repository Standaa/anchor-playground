import { Token } from "@solana/spl-token";

const { web3, setProvider, workspace, createMint } = require("@project-serum/anchor");

module.exports = async function (provider) {
  setProvider(provider);

  const connection = provider.connection;
  const deployer = provider.wallet.payer;
  const accountAsSeed = new web3.Account();
  const poolProgram = workspace.AnchorPlayground;

  await poolProgram.state.rpc.new({
    accounts: {},
  });

  // Create a PDA
  const [poolAuthority, nonce] = await web3.PublicKey.findProgramAddress(
    [accountAsSeed.publicKey.toBuffer()], // Random account used as seed
    poolProgram.programId,
  );

  // connection: Connection - connection The connection to use
  // payer: Account - payer Fee payer for transaction
  // mintAuthority: PublicKey - mintAuthority Account or multisig that will control minting
  // freezeAuthority: PublicKey - freezeAuthority Optional account or multisig that can freeze token accounts
  // decimals: number - decimals Location of the decimal place
  // programId: PublicKey - programId Optional token programId, uses the system programId by default

  const poolMint: Token = await createMint(
    connection,
    deployer,
    deployer,
    deployer,
    8,
    poolProgram.programId,
  );

  await poolProgram.state.rpc.initialize(
    nonce,
    provider.wallet.publicKey,
    provider.wallet.publicKey,
    poolAuthority,
    accountAsSeed.publicKey,
    {
      accounts: {
        poolMint: poolMint.publicKey,
      },
    },
  );

  console.log("Nonce", nonce);
  console.log("AccountAsSeed pubkey", accountAsSeed.publicKey.toBase58());
  console.log("PoolMint pubkey", poolMint.publicKey.toBase58());
  console.log("wallet publickey :", provider.wallet.publicKey.toBase58());
};
