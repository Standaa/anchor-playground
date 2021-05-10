use anchor_lang::prelude::*;

#[program]
mod anchor_playground {
    use super::*;

    #[state]
    pub struct AnchorPlaygroundState {
        pub initialized: bool,
        pub nonce: u8,
        pub authority: Pubkey,
        pub signer: Pubkey,
    }

    impl AnchorPlaygroundState {
        pub fn new(_ctx: Context<New>) -> Result<Self, ProgramError> {
            Ok(Self {
                initialized: false,
                nonce: 0,
                authority: Pubkey::default(),
                signer: Pubkey::default(),
            })
        }

        pub fn initialize(
            &mut self,
            _ctx: Context<Initialize>,
            nonce: u8,
            authority: Pubkey,
            signer: Pubkey,
        ) -> Result<(), ProgramError> {
            self.initialized = true;
            self.nonce = nonce;
            self.signer = signer;
            self.authority = authority;

            Ok(())
        }
    }

    pub fn create_user_account(ctx: Context<CreateUserAccount>) -> ProgramResult {
        let user_account = &mut ctx.accounts.user_account;
        user_account.data = 9;
        user_account.option_list = vec![8];

        Ok(())
    }
}

#[derive(Accounts)]
pub struct New {}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct CreateUserAccount<'info> {
    #[account(associated = authority, space=128)]
    pub user_account: ProgramAccount<'info, UserAccount>,
    #[account(mut)] //, signer
    pub authority: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}

#[associated]
pub struct UserAccount {
    pub data: u64,
    pub option_list: Vec<u8>,
}
