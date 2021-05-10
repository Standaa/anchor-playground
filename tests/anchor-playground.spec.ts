import assert from "assert";
import { Provider, setProvider, web3, workspace } from "@project-serum/anchor";
import { Keypair } from "@solana/web3.js";

describe("anchor-playground", () => {
  const provider = Provider.local();

  setProvider(provider);

  const program = workspace.AnchorPlayground;
  const ANCHOR_PLAYGROUND_SEED = Buffer.from("ANCHOR_PLAYGROUND_SEED");

  it("Initializes", async () => {
    const [pdaAuthority, nonce] = await web3.PublicKey.findProgramAddress(
      [ANCHOR_PLAYGROUND_SEED],
      program.programId
    );

    await program.state.rpc.new({
      accounts: {},
    });

    await program.state.rpc.initialize(
      nonce,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      {
        accounts: {},
      }
    );

    const playgroundState = await program.state();
    const authority = provider.wallet.publicKey;

    // const userKeypair = new web3.Account();

    const associatedAddress = await program.account.userAccount.associatedAddress(
      authority
    );

    try {
      await program.rpc.createUserAccount({
        accounts: {
          userAccount: associatedAddress,
          authority: authority,
          rent: web3.SYSVAR_RENT_PUBKEY,
          systemProgram: web3.SystemProgram.programId,
        },
      });
    } catch (e) {
      console.log("Err", e);
    }

    const account = await program.account.userAccount.associated(authority);
    assert.ok(account.data.toNumber() === 9);
    // console.log(Array.from(account.optionList)[0]);
  });
});
