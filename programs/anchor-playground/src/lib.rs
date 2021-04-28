use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, TokenAccount, Transfer};
use std::str;

const ANCHOR_PLAYGROUND_SEED: &str = "AnchorPlayground";

#[program]
pub mod anchor_playground {
    use super::*;

    #[state]
    pub struct PoolState {
        pub initialized: bool,
        pub nonce: u8,
        pub authority: Pubkey,
        pub signer: Pubkey,
        pub pool_token_mint: Pubkey,
        pub pool_token_account: Pubkey,
    }

    impl PoolState {
        pub fn new(_ctx: Context<New>) -> Result<Self> {
            Ok(Self {
                initialized: false,
                nonce: 0,
                authority: Pubkey::default(),
                signer: Pubkey::default(),
                pool_token_mint: Pubkey::default(),
                pool_token_account: Pubkey::default(),
            })
        }

        pub fn initialize(
            &mut self,
            ctx: Context<Initialize>,
            nonce: u8,
            authority: Pubkey,
            signer: Pubkey,
        ) -> Result<()> {
            self.initialized = true;
            self.nonce = nonce;
            self.signer = signer;
            self.authority = authority;
            self.pool_token_mint = *ctx.accounts.pool_token_mint.to_account_info().key; // Token Mint Account pub key
            self.pool_token_account = *ctx.accounts.pool_token_account.to_account_info().key; // Token Mint Account pub key

            // Mint total token supply to deployer account
            let amount = u64::pow(10, 3);

            let seeds = &[ANCHOR_PLAYGROUND_SEED.as_bytes(), &[self.nonce]];
            let signer = &[&seeds[..]];

            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.clone(),
                MintTo {
                    mint: ctx.accounts.pool_token_mint.to_account_info(),
                    to: ctx.accounts.pool_token_account.to_account_info(),
                    authority: ctx.accounts.pool_token_mint_authority.to_account_info(),
                },
                signer,
            );
            token::mint_to(cpi_ctx, amount)?;

            Ok(())
        }

        // self.pool_account = *ctx.accounts.pool_account.to_account_info().key; // Token Account pub key

        pub fn deposit(&mut self, ctx: Context<Deposit>, amount: u64) -> Result<()> {
            let seeds = &[ANCHOR_PLAYGROUND_SEED.as_bytes(), &[self.nonce]];
            let signer = &[&seeds[..]];

            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.clone(),
                Transfer {
                    from: ctx.accounts.pool_token_account.to_account_info(),
                    to: ctx.accounts.user_associated_token_account.to_account_info(),
                    authority: ctx.accounts.pool_token_mint_authority.to_account_info(),
                },
                signer,
            );
            token::transfer(cpi_ctx, amount)?;

            Ok(())
        }
    }
    pub fn initialize_user_account(ctx: Context<InitializeUserAccount>) -> ProgramResult {
        let user_account = &mut ctx.accounts.user_account;
        user_account.shares = 0;
        user_account.collateral = 0;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct New {}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut, "pool_token_mint.decimals == 8")]
    pool_token_mint: CpiAccount<'info, Mint>,
    #[account(mut)]
    pool_token_account: CpiAccount<'info, TokenAccount>,
    //TODO: Check ACL
    pool_token_mint_authority: AccountInfo<'info>,
    #[account("token_program.key == &token::ID")]
    token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct InitializeUserAccount<'info> {
    #[account(associated = authority )]
    user_account: ProgramAccount<'info, UserAccount>,
    #[account(mut, signer)]
    authority: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
    system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pool_token_account: CpiAccount<'info, TokenAccount>,
    //TODO: Check ACL
    pool_token_mint_authority: AccountInfo<'info>,
    #[account(mut)]
    pub user_associated_token_account: CpiAccount<'info, TokenAccount>,
    #[account("token_program.key == &token::ID")]
    token_program: AccountInfo<'info>,
}

#[associated]
pub struct UserAccount {
    pub shares: u64,
    pub collateral: u64,
}

#[error]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
}

fn print_type_of<T>(_: &T) {
    println!("{}", std::any::type_name::<T>())
}
