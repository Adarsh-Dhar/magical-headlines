use anchor_lang::prelude::*;

declare_id!("5xojUwiG49aFS2UJyANpnNJnhsH7aat4e32hSiy7vjQD");

#[program]
pub mod contract1 {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
