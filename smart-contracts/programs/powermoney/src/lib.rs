use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("HWgSd3Dd67ypxPYToXYATipRdcoPb3SJAc1EYyJyLoFg");

const MAX_CONDITIONS: usize = 5;
const MAX_DESCRIPTION_LEN: usize = 256;
const MAX_MILESTONE_DESC_LEN: usize = 256;
const MAX_APPROVERS: usize = 8;
const MAX_SPLIT_RECIPIENTS: usize = 10;
const MAX_ALLOWED_CATEGORIES: usize = 8;
const MAX_CATEGORY_LEN: usize = 32;
const MAX_MERCHANTS: usize = 1024;
const MAX_DISPUTE_REASON_LEN: usize = 256;
const MAX_JURORS: usize = 7;

#[program]
pub mod powermoney {
    use super::*;

    pub fn create_vault(
        ctx: Context<CreateVault>,
        id: [u8; 32],
        amount: u64,
        description: String,
        conditions: Vec<Condition>,
    ) -> Result<()> {
        require!(!conditions.is_empty(), PowerMoneyError::ConditionNotMet);
        require!(conditions.len() <= MAX_CONDITIONS, PowerMoneyError::MaxConditionsExceeded);
        require!(ctx.accounts.creator.key() != ctx.accounts.recipient.key(), PowerMoneyError::UnauthorizedApprover);
        require!(description.len() <= MAX_DESCRIPTION_LEN, PowerMoneyError::ConditionNotMet);

        validate_conditions(&conditions)?;

        let now: i64 = Clock::get()?.unix_timestamp;
        let vault: &mut Account<PaymentVault> = &mut ctx.accounts.vault;
        vault.id = id;
        vault.creator = ctx.accounts.creator.key();
        vault.recipient = ctx.accounts.recipient.key();
        vault.amount = amount;
        vault.released_amount = 0;
        vault.conditions = conditions;
        vault.status = VaultStatus::Active;
        vault.created_at = now;
        vault.updated_at = now;
        vault.description = description;
        vault.bump = ctx.bumps.vault;

        require!(ctx.accounts.creator_token_account.amount >= amount, PowerMoneyError::InsufficientFunds);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.creator_token_account.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            amount,
        )?;

        emit!(VaultCreated {
            vault: vault.key(),
            creator: vault.creator,
            recipient: vault.recipient,
            amount,
            timestamp: now,
        });

        Ok(())
    }

    pub fn release_time_lock(ctx: Context<ReleaseFunds>, condition_index: u8) -> Result<()> {
        let now: i64 = Clock::get()?.unix_timestamp;
        let (vault_key, recipient, release_amount) = {
            let vault: &mut Account<PaymentVault> = &mut ctx.accounts.vault;
            require!(vault.status == VaultStatus::Active || vault.status == VaultStatus::PartiallyReleased, PowerMoneyError::VaultNotActive);

            let idx = usize::from(condition_index);
            require!(idx < vault.conditions.len(), PowerMoneyError::ConditionNotMet);
            let total_amount = vault.amount;

            let release_amount = match &mut vault.conditions[idx] {
                Condition::TimeLock { release_time, percentage } => {
                    require!(now >= *release_time, PowerMoneyError::TimeLockNotExpired);
                    require!(*percentage > 0, PowerMoneyError::ConditionNotMet);
                    let amount = percentage_to_amount(total_amount, *percentage)?;
                    *percentage = 0;
                    amount
                }
                _ => return err!(PowerMoneyError::ConditionNotMet),
            };

            apply_release_state(vault, release_amount, now);
            (vault.key(), vault.recipient, release_amount)
        };

        transfer_from_vault(
            release_amount,
            vault_key,
            &ctx.accounts.vault_token_account,
            &ctx.accounts.recipient_token_account.to_account_info(),
            &ctx.accounts.vault_authority,
            &ctx.accounts.token_program,
        )?;

        emit!(FundsReleased {
            vault: vault_key,
            recipient,
            amount: release_amount,
            condition_type: "TimeLock".to_string(),
            timestamp: now,
        });

        Ok(())
    }

    pub fn approve_milestone(ctx: Context<ApproveMilestone>, condition_index: u8) -> Result<()> {
        let now: i64 = Clock::get()?.unix_timestamp;
        let approver_key = ctx.accounts.approver.key();
        let (vault_key, recipient, release_amount) = {
            let vault: &mut Account<PaymentVault> = &mut ctx.accounts.vault;
            require!(vault.status == VaultStatus::Active || vault.status == VaultStatus::PartiallyReleased, PowerMoneyError::VaultNotActive);

            let idx = usize::from(condition_index);
            require!(idx < vault.conditions.len(), PowerMoneyError::ConditionNotMet);
            let total_amount = vault.amount;
            let mut release_amount: u64 = 0;

            match &mut vault.conditions[idx] {
                Condition::MilestoneApproval {
                    required_approvers,
                    approvals_received,
                    percentage,
                    completed,
                    ..
                } => {
                    require!(!*completed, PowerMoneyError::ConditionNotMet);
                    require!(required_approvers.contains(&approver_key), PowerMoneyError::UnauthorizedApprover);
                    require!(!approvals_received.contains(&approver_key), PowerMoneyError::AlreadyApproved);

                    approvals_received.push(approver_key);
                    if approvals_received.len() == required_approvers.len() {
                        *completed = true;
                        release_amount = percentage_to_amount(total_amount, *percentage)?;
                        apply_release_state(vault, release_amount, now);
                    }
                }
                _ => return err!(PowerMoneyError::ConditionNotMet),
            }

            (vault.key(), vault.recipient, release_amount)
        };

        emit!(MilestoneApproved {
            vault: vault_key,
            approver: approver_key,
            milestone_index: condition_index,
            timestamp: now,
        });

        if release_amount > 0 {
            transfer_from_vault(
                release_amount,
                vault_key,
                &ctx.accounts.vault_token_account,
                &ctx.accounts.recipient_token_account.to_account_info(),
                &ctx.accounts.vault_authority,
                &ctx.accounts.token_program,
            )?;
            emit!(FundsReleased {
                vault: vault_key,
                recipient,
                amount: release_amount,
                condition_type: "MilestoneApproval".to_string(),
                timestamp: now,
            });
        }

        Ok(())
    }

    pub fn trigger_oracle(
        ctx: Context<TriggerOracle>,
        condition_index: u8,
        observed_value: i64,
    ) -> Result<()> {
        let now: i64 = Clock::get()?.unix_timestamp;
        let feed_key = ctx.accounts.oracle_feed.key();
        let (vault_key, recipient, release_amount, threshold) = {
            let vault: &mut Account<PaymentVault> = &mut ctx.accounts.vault;
            require!(vault.status == VaultStatus::Active || vault.status == VaultStatus::PartiallyReleased, PowerMoneyError::VaultNotActive);

            let idx = usize::from(condition_index);
            require!(idx < vault.conditions.len(), PowerMoneyError::ConditionNotMet);
            let total_amount = vault.amount;

            let (release_amount, threshold) = match &mut vault.conditions[idx] {
                Condition::OracleTrigger {
                    oracle_feed,
                    operator,
                    threshold,
                    percentage,
                    triggered,
                } => {
                    require!(!*triggered, PowerMoneyError::ConditionNotMet);
                    require!(*oracle_feed == feed_key, PowerMoneyError::InvalidOracleValue);
                    require!(compare_oracle(observed_value, *threshold, operator), PowerMoneyError::ConditionNotMet);
                    *triggered = true;
                    (percentage_to_amount(total_amount, *percentage)?, *threshold)
                }
                _ => return err!(PowerMoneyError::ConditionNotMet),
            };

            apply_release_state(vault, release_amount, now);
            (vault.key(), vault.recipient, release_amount, threshold)
        };

        transfer_from_vault(
            release_amount,
            vault_key,
            &ctx.accounts.vault_token_account,
            &ctx.accounts.recipient_token_account.to_account_info(),
            &ctx.accounts.vault_authority,
            &ctx.accounts.token_program,
        )?;

        emit!(OracleTriggered {
            vault: vault_key,
            feed: feed_key,
            value: observed_value,
            threshold,
            timestamp: now,
        });

        emit!(FundsReleased {
            vault: vault_key,
            recipient,
            amount: release_amount,
            condition_type: "OracleTrigger".to_string(),
            timestamp: now,
        });

        Ok(())
    }

pub fn execute_split<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteSplit<'info>>,
        condition_index: u8,
    ) -> Result<()> {
        let now: i64 = Clock::get()?.unix_timestamp;
        let (vault_key, remaining, splits) = {
            let vault: &mut Account<PaymentVault> = &mut ctx.accounts.vault;
            require!(vault.status == VaultStatus::Active || vault.status == VaultStatus::PartiallyReleased, PowerMoneyError::VaultNotActive);
            let idx = usize::from(condition_index);
            require!(idx < vault.conditions.len(), PowerMoneyError::ConditionNotMet);

            let splits = match &vault.conditions[idx] {
                Condition::AutoSplit { splits } => splits.clone(),
                _ => return err!(PowerMoneyError::ConditionNotMet),
            };
            let split_total: u16 = splits.iter().map(|item| u16::from(item.percentage)).sum();
            require!(split_total == 100, PowerMoneyError::InvalidSplitTotal);

            let remaining: u64 = vault.amount.saturating_sub(vault.released_amount);
            require!(remaining > 0, PowerMoneyError::ConditionNotMet);

            vault.released_amount = vault.amount;
            vault.status = VaultStatus::Released;
            vault.updated_at = now;
            (vault.key(), remaining, splits)
        };

        require!(
            ctx.remaining_accounts.len() == splits.len(),
            PowerMoneyError::ConditionNotMet
        );

        for (i, split) in splits.iter().enumerate() {
            let amount = if i == splits.len() - 1 {
                remaining.saturating_sub(
                    splits[..i]
                        .iter()
                        .map(|s| percentage_to_amount(remaining, s.percentage).unwrap_or(0))
                        .sum::<u64>(),
                )
            } else {
                percentage_to_amount(remaining, split.percentage)?
            };

            transfer_from_vault(
                amount,
                vault_key,
                &ctx.accounts.vault_token_account,
                &ctx.remaining_accounts[i],
                &ctx.accounts.vault_authority,
                &ctx.accounts.token_program,
            )?;
        }

        emit!(SplitExecuted {
            vault: vault_key,
            amount: remaining,
            recipients: splits.len() as u8,
            timestamp: now,
        });

        Ok(())
    }

    pub fn cancel_vault(ctx: Context<CancelVault>) -> Result<()> {
        let now: i64 = Clock::get()?.unix_timestamp;
        let (vault_key, amount) = {
            let vault: &mut Account<PaymentVault> = &mut ctx.accounts.vault;
            require!(vault.creator == ctx.accounts.creator.key(), PowerMoneyError::UnauthorizedApprover);
            require!(vault.released_amount == 0, PowerMoneyError::ConditionNotMet);
            require!(vault.status == VaultStatus::Active, PowerMoneyError::VaultNotActive);
            vault.status = VaultStatus::Cancelled;
            vault.updated_at = now;
            (vault.key(), vault.amount)
        };
        transfer_from_vault(
            amount,
            vault_key,
            &ctx.accounts.vault_token_account,
            &ctx.accounts.creator_token_account.to_account_info(),
            &ctx.accounts.vault_authority,
            &ctx.accounts.token_program,
        )?;

        Ok(())
    }

    pub fn raise_dispute(
        ctx: Context<RaiseDispute>,
        reason: String,
        jurors: Vec<Pubkey>,
    ) -> Result<()> {
        let now: i64 = Clock::get()?.unix_timestamp;
        require!(!reason.is_empty() && reason.len() <= MAX_DISPUTE_REASON_LEN, PowerMoneyError::ConditionNotMet);
        require!(jurors.len() >= 3 && jurors.len() <= MAX_JURORS, PowerMoneyError::ConditionNotMet);

        let vault: &mut Account<PaymentVault> = &mut ctx.accounts.vault;
        require!(vault.status == VaultStatus::Active || vault.status == VaultStatus::PartiallyReleased, PowerMoneyError::VaultNotActive);

        let dispute: &mut Account<Dispute> = &mut ctx.accounts.dispute;
        dispute.vault = vault.key();
        dispute.plaintiff = ctx.accounts.plaintiff.key();
        dispute.defendant = if ctx.accounts.plaintiff.key() == vault.creator { vault.recipient } else { vault.creator };
        dispute.reason = reason;
        dispute.jurors = jurors;
        dispute.voters = vec![];
        dispute.votes_for_plaintiff = 0;
        dispute.votes_for_defendant = 0;
        dispute.status = DisputeStatus::Open;
        dispute.created_at = now;
        dispute.deadline = now + (7 * 24 * 60 * 60);
        dispute.bump = ctx.bumps.dispute;

        vault.status = VaultStatus::Disputed;
        vault.updated_at = now;

        emit!(DisputeRaised {
            vault: vault.key(),
            plaintiff: dispute.plaintiff,
            timestamp: now,
        });

        Ok(())
    }

    pub fn vote_dispute(ctx: Context<VoteDispute>, vote_for_plaintiff: bool) -> Result<()> {
        let now: i64 = Clock::get()?.unix_timestamp;
        let vault: &mut Account<PaymentVault> = &mut ctx.accounts.vault;
        let dispute: &mut Account<Dispute> = &mut ctx.accounts.dispute;

        require!(dispute.status == DisputeStatus::Open || dispute.status == DisputeStatus::Voting, PowerMoneyError::ConditionNotMet);
        require!(dispute.jurors.contains(&ctx.accounts.juror.key()), PowerMoneyError::UnauthorizedApprover);
        require!(!dispute.voters.contains(&ctx.accounts.juror.key()), PowerMoneyError::AlreadyApproved);

        if now > dispute.deadline {
            dispute.status = DisputeStatus::Expired;
            return err!(PowerMoneyError::DisputeExpired);
        }

        dispute.status = DisputeStatus::Voting;

        if vote_for_plaintiff {
            dispute.votes_for_plaintiff = dispute.votes_for_plaintiff.saturating_add(1);
        } else {
            dispute.votes_for_defendant = dispute.votes_for_defendant.saturating_add(1);
        }

        dispute.voters.push(ctx.accounts.juror.key());

        let majority: u8 = ((dispute.jurors.len() as u8) / 2).saturating_add(1);
        if dispute.votes_for_plaintiff >= majority || dispute.votes_for_defendant >= majority {
            let winner = if dispute.votes_for_plaintiff >= majority {
                dispute.status = DisputeStatus::ResolvedForPlaintiff;
                dispute.plaintiff
            } else {
                dispute.status = DisputeStatus::ResolvedForDefendant;
                dispute.defendant
            };

            let remaining: u64 = vault.amount.saturating_sub(vault.released_amount);
            if remaining > 0 {
                let destination = if winner == vault.creator {
                    &ctx.accounts.creator_token_account
                } else {
                    &ctx.accounts.recipient_token_account
                };
                transfer_from_vault(
                    remaining,
                    vault.key(),
                    &ctx.accounts.vault_token_account,
                    &destination.to_account_info(),
                    &ctx.accounts.vault_authority,
                    &ctx.accounts.token_program,
                )?;
            }

            vault.released_amount = vault.amount;
            vault.status = VaultStatus::Released;
            vault.updated_at = now;

            emit!(DisputeResolved {
                dispute: dispute.key(),
                winner,
                timestamp: now,
            });
        }

        Ok(())
    }

    pub fn register_merchant(ctx: Context<RegisterMerchant>, merchant: Pubkey) -> Result<()> {
        let registry: &mut Account<MerchantRegistry> = &mut ctx.accounts.registry;
        require!(registry.admin == ctx.accounts.admin.key(), PowerMoneyError::UnauthorizedApprover);

        if !registry.merchants.contains(&merchant) {
            registry.merchants.push(merchant);
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(id: [u8; 32], amount: u64, description: String, conditions: Vec<Condition>)]
pub struct CreateVault<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    /// CHECK: recipient identity only
    pub recipient: UncheckedAccount<'info>,
    #[account(
        init,
        payer = creator,
        space = PaymentVault::space(),
        seeds = [b"vault", id.as_ref()],
        bump
    )]
    pub vault: Account<'info, PaymentVault>,
    /// CHECK: PDA authority for vault token account signing
    #[account(seeds = [b"vault-authority", vault.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseFunds<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub vault: Account<'info, PaymentVault>,
    /// CHECK: PDA authority for vault token account signing
    #[account(seeds = [b"vault-authority", vault.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
pub struct ApproveMilestone<'info> {
    #[account(mut)]
    pub approver: Signer<'info>,
    #[account(mut)]
    pub vault: Account<'info, PaymentVault>,
    /// CHECK: PDA authority for vault token account signing
    #[account(seeds = [b"vault-authority", vault.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
pub struct TriggerOracle<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub vault: Account<'info, PaymentVault>,
    /// CHECK: oracle feed account identity
    pub oracle_feed: UncheckedAccount<'info>,
    /// CHECK: PDA authority for vault token account signing
    #[account(seeds = [b"vault-authority", vault.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
pub struct ExecuteSplit<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub vault: Account<'info, PaymentVault>,
    /// CHECK: PDA authority for vault token account signing
    #[account(seeds = [b"vault-authority", vault.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelVault<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut)]
    pub vault: Account<'info, PaymentVault>,
    /// CHECK: PDA authority for vault token account signing
    #[account(seeds = [b"vault-authority", vault.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RaiseDispute<'info> {
    #[account(mut)]
    pub plaintiff: Signer<'info>,
    #[account(mut)]
    pub vault: Account<'info, PaymentVault>,
    #[account(
        init,
        payer = plaintiff,
        space = Dispute::space(),
        seeds = [b"dispute", vault.key().as_ref()],
        bump
    )]
    pub dispute: Account<'info, Dispute>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VoteDispute<'info> {
    #[account(mut)]
    pub juror: Signer<'info>,
    #[account(mut)]
    pub vault: Account<'info, PaymentVault>,
    #[account(mut, seeds = [b"dispute", vault.key().as_ref()], bump = dispute.bump)]
    pub dispute: Account<'info, Dispute>,
    /// CHECK: PDA authority for vault token account signing
    #[account(seeds = [b"vault-authority", vault.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RegisterMerchant<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub registry: Account<'info, MerchantRegistry>,
}

#[account]
pub struct PaymentVault {
    pub id: [u8; 32],
    pub creator: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub released_amount: u64,
    pub conditions: Vec<Condition>,
    pub status: VaultStatus,
    pub created_at: i64,
    pub updated_at: i64,
    pub description: String,
    pub bump: u8,
}

impl PaymentVault {
    pub fn space() -> usize {
        8 + 32 + 32 + 32 + 8 + 8 + 4 + (MAX_CONDITIONS * Condition::max_space()) + 1 + 8 + 8 + 4 + MAX_DESCRIPTION_LEN + 1
    }
}

#[account]
pub struct MerchantRegistry {
    pub admin: Pubkey,
    pub category: String,
    pub merchants: Vec<Pubkey>,
    pub bump: u8,
}

#[account]
pub struct Dispute {
    pub vault: Pubkey,
    pub plaintiff: Pubkey,
    pub defendant: Pubkey,
    pub reason: String,
    pub jurors: Vec<Pubkey>,
    pub voters: Vec<Pubkey>,
    pub votes_for_plaintiff: u8,
    pub votes_for_defendant: u8,
    pub status: DisputeStatus,
    pub created_at: i64,
    pub deadline: i64,
    pub bump: u8,
}

impl Dispute {
    pub fn space() -> usize {
        8 + 32 + 32 + 32 + 4 + MAX_DISPUTE_REASON_LEN + 4 + (MAX_JURORS * 32) + 4 + (MAX_JURORS * 32) + 1 + 1 + 1 + 8 + 8 + 1
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum VaultStatus {
    Active,
    PartiallyReleased,
    Released,
    Disputed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum DisputeStatus {
    Open,
    Voting,
    ResolvedForPlaintiff,
    ResolvedForDefendant,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ComparisonOperator {
    LessThan,
    GreaterThan,
    Equal,
    LessThanOrEqual,
    GreaterThanOrEqual,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub struct SplitRecipient {
    pub wallet: Pubkey,
    pub percentage: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Condition {
    TimeLock {
        release_time: i64,
        percentage: u8,
    },
    MilestoneApproval {
        description: String,
        required_approvers: Vec<Pubkey>,
        approvals_received: Vec<Pubkey>,
        percentage: u8,
        completed: bool,
    },
    AutoSplit {
        splits: Vec<SplitRecipient>,
    },
    OracleTrigger {
        oracle_feed: Pubkey,
        operator: ComparisonOperator,
        threshold: i64,
        percentage: u8,
        triggered: bool,
    },
    CategoryRestrict {
        merchant_registry: Pubkey,
        allowed_categories: Vec<String>,
        percentage: u8,
    },
}

impl Condition {
    pub fn max_space() -> usize {
        1 + 8 + 1 +
            (4 + MAX_MILESTONE_DESC_LEN + 4 + (MAX_APPROVERS * 32) + 4 + (MAX_APPROVERS * 32) + 1 + 1)
            + (4 + MAX_SPLIT_RECIPIENTS * (32 + 1))
            + (32 + 1 + 8 + 1 + 1)
            + (32 + 4 + (MAX_ALLOWED_CATEGORIES * (4 + MAX_CATEGORY_LEN)) + 1)
    }
}

#[event]
pub struct VaultCreated {
    pub vault: Pubkey,
    pub creator: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct FundsReleased {
    pub vault: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub condition_type: String,
    pub timestamp: i64,
}

#[event]
pub struct MilestoneApproved {
    pub vault: Pubkey,
    pub approver: Pubkey,
    pub milestone_index: u8,
    pub timestamp: i64,
}

#[event]
pub struct OracleTriggered {
    pub vault: Pubkey,
    pub feed: Pubkey,
    pub value: i64,
    pub threshold: i64,
    pub timestamp: i64,
}

#[event]
pub struct SplitExecuted {
    pub vault: Pubkey,
    pub amount: u64,
    pub recipients: u8,
    pub timestamp: i64,
}

#[event]
pub struct DisputeRaised {
    pub vault: Pubkey,
    pub plaintiff: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct DisputeResolved {
    pub dispute: Pubkey,
    pub winner: Pubkey,
    pub timestamp: i64,
}

#[error_code]
pub enum PowerMoneyError {
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Condition not met")]
    ConditionNotMet,
    #[msg("Unauthorized approver")]
    UnauthorizedApprover,
    #[msg("Vault is not active")]
    VaultNotActive,
    #[msg("Invalid percentages")]
    InvalidPercentages,
    #[msg("Time lock has not expired")]
    TimeLockNotExpired,
    #[msg("Already approved")]
    AlreadyApproved,
    #[msg("Dispute expired")]
    DisputeExpired,
    #[msg("Invalid oracle value")]
    InvalidOracleValue,
    #[msg("Maximum conditions exceeded")]
    MaxConditionsExceeded,
    #[msg("Invalid split total")]
    InvalidSplitTotal,
}

fn apply_release_state(vault: &mut Account<PaymentVault>, amount: u64, now: i64) {
    vault.released_amount = vault.released_amount.saturating_add(amount);
    vault.updated_at = now;
    vault.status = if vault.released_amount >= vault.amount {
        VaultStatus::Released
    } else {
        VaultStatus::PartiallyReleased
    };
}

fn transfer_from_vault<'info>(
    amount: u64,
    vault_key: Pubkey,
    vault_token_account: &Account<'info, TokenAccount>,
    destination: &AccountInfo<'info>,
    vault_authority: &UncheckedAccount<'info>,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    require!(vault_token_account.amount >= amount, PowerMoneyError::InsufficientFunds);

    let (_, authority_bump) =
        Pubkey::find_program_address(&[b"vault-authority", vault_key.as_ref()], &crate::ID);
    let bump_seed: [u8; 1] = [authority_bump];
    let signer_seeds: &[&[u8]] = &[b"vault-authority", vault_key.as_ref(), &bump_seed];

    token::transfer(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            Transfer {
                from: vault_token_account.to_account_info(),
                to: destination.clone(),
                authority: vault_authority.to_account_info(),
            },
            &[signer_seeds],
        ),
        amount,
    )?;

    Ok(())
}

fn validate_conditions(conditions: &[Condition]) -> Result<()> {
    let mut percentage_total: u16 = 0;

    for condition in conditions {
        match condition {
            Condition::TimeLock { percentage, .. } => percentage_total += u16::from(*percentage),
            Condition::MilestoneApproval { required_approvers, percentage, .. } => {
                require!(!required_approvers.is_empty(), PowerMoneyError::ConditionNotMet);
                require!(required_approvers.len() <= MAX_APPROVERS, PowerMoneyError::ConditionNotMet);
                percentage_total += u16::from(*percentage);
            }
            Condition::OracleTrigger { percentage, .. } => percentage_total += u16::from(*percentage),
            Condition::CategoryRestrict { allowed_categories, percentage, .. } => {
                require!(!allowed_categories.is_empty(), PowerMoneyError::ConditionNotMet);
                percentage_total += u16::from(*percentage);
            }
            Condition::AutoSplit { splits } => {
                let split_total: u16 = splits.iter().map(|s| u16::from(s.percentage)).sum();
                require!(split_total == 100, PowerMoneyError::InvalidSplitTotal);
            }
        }
    }

    if percentage_total > 0 {
        require!(percentage_total == 100, PowerMoneyError::InvalidPercentages);
    }

    Ok(())
}

fn percentage_to_amount(total: u64, percentage: u8) -> Result<u64> {
    require!(percentage <= 100, PowerMoneyError::InvalidPercentages);
    Ok(total.saturating_mul(u64::from(percentage)) / 100)
}

fn compare_oracle(value: i64, threshold: i64, operator: &ComparisonOperator) -> bool {
    match operator {
        ComparisonOperator::LessThan => value < threshold,
        ComparisonOperator::GreaterThan => value > threshold,
        ComparisonOperator::Equal => value == threshold,
        ComparisonOperator::LessThanOrEqual => value <= threshold,
        ComparisonOperator::GreaterThanOrEqual => value >= threshold,
    }
}
