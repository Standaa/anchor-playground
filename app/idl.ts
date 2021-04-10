import { Idl } from "@project-serum/anchor";

const idl: Idl = {
  version: "0.0.0",
  name: "anchor_playground",
  instructions: [
    {
      name: "create",
      accounts: [
        {
          name: "counter",
          isMut: true,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "authority",
          type: "publicKey",
        },
      ],
    },
    {
      name: "increment",
      accounts: [
        {
          name: "counter",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "Counter",
      type: {
        kind: "struct",
        fields: [
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "count",
            type: "u64",
          },
        ],
      },
    },
  ],
};

export default idl;
