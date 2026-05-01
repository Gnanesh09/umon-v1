import { Resend } from "resend";
import { env } from "../config/env.js";
import { supabase } from "../lib/supabase.js";

export class NotificationService {
  private readonly resend: Resend | null;

  constructor() {
    this.resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  }

  private async createNotification(input: {
    walletAddress: string;
    type: string;
    title: string;
    message: string;
    vaultId?: string;
  }): Promise<void> {
    await supabase.from("notifications").insert({
      wallet_address: input.walletAddress,
      type: input.type,
      title: input.title,
      message: input.message,
      vault_id: input.vaultId,
    });
  }

  private async sendEmailIfEnabled(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      return;
    }

    await this.resend.emails.send({
      from: "PowerMoney <no-reply@powermoney.app>",
      to,
      subject,
      html,
    });
  }

  async notifyVaultCreated(walletAddress: string, vaultId: string, amountUsdc: number): Promise<void> {
    await this.createNotification({
      walletAddress,
      type: "vault_created",
      title: "Vault created",
      message: `Vault ${vaultId} created with ${amountUsdc} USDC locked.`,
      vaultId,
    });
    await this.notifyByEmailIfProfileExists(
      walletAddress,
      "Vault created",
      `<p>Vault <strong>${vaultId}</strong> created with <strong>${amountUsdc} USDC</strong> locked.</p>`,
    );
  }

  async notifyFundsReleased(walletAddress: string, vaultId: string, amountUsdc: number): Promise<void> {
    await this.createNotification({
      walletAddress,
      type: "funds_released",
      title: "Funds released",
      message: `${amountUsdc} USDC released from vault ${vaultId}.`,
      vaultId,
    });
    await this.notifyByEmailIfProfileExists(
      walletAddress,
      "Funds released",
      `<p><strong>${amountUsdc} USDC</strong> released from vault <strong>${vaultId}</strong>.</p>`,
    );
  }

  async notifyMilestoneApproved(walletAddress: string, vaultId: string): Promise<void> {
    await this.createNotification({
      walletAddress,
      type: "milestone_approved",
      title: "Milestone approved",
      message: `A milestone was approved for vault ${vaultId}.`,
      vaultId,
    });
    await this.notifyByEmailIfProfileExists(
      walletAddress,
      "Milestone approved",
      `<p>A milestone was approved for vault <strong>${vaultId}</strong>.</p>`,
    );
  }

  async notifyDisputeRaised(walletAddress: string, vaultId: string): Promise<void> {
    await this.createNotification({
      walletAddress,
      type: "dispute_raised",
      title: "Dispute raised",
      message: `A dispute has been opened for vault ${vaultId}.`,
      vaultId,
    });
    await this.notifyByEmailIfProfileExists(
      walletAddress,
      "Dispute raised",
      `<p>A dispute has been opened for vault <strong>${vaultId}</strong>.</p>`,
    );
  }

  async notifyByEmailIfProfileExists(walletAddress: string, subject: string, html: string): Promise<void> {
    const { data } = await supabase.from("users").select("email").eq("wallet_address", walletAddress).single();
    if (data?.email) {
      await this.sendEmailIfEnabled(data.email, subject, html);
    }
  }
}