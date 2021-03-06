import assert from "assert";
import * as anchor from "@project-serum/anchor";

describe("anchor-playground", () => {
  const provider = anchor.Provider.local();

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  // Counter for the tests.
  const counter = new anchor.web3.Account();

  // Program for the tests.
  const program = anchor.workspace.AnchorPlayground;

  it("Creates a counter", async () => {
    await program.rpc.create(provider.wallet.publicKey, {
      accounts: {
        counter: counter.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [counter],
      instructions: [await program.account.counter.createInstruction(counter)],
    });

    let counterAccount = await program.account.counter(counter.publicKey);

    assert.ok(counterAccount.authority.equals(provider.wallet.publicKey));
    assert.ok(counterAccount.count.toNumber() === 0);
  });

  it("Updates a counter", async () => {
    await program.rpc.increment({
      accounts: {
        counter: counter.publicKey,
        authority: provider.wallet.publicKey,
      },
    });

    const counterAccount = await program.account.counter(counter.publicKey);

    assert.ok(counterAccount.authority.equals(provider.wallet.publicKey));
    assert.ok(counterAccount.count.toNumber() == 1);
  });
});
