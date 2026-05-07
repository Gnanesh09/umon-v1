import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { PaymentLinkService } from "./PaymentLinkService.js";

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type CustomerInfo = {
  name?: string;
  email?: string;
  wallet?: string;
};

type CreateInvoiceInput = {
  merchantId: string;
  merchantWallet: string;
  lineItems: LineItem[];
  dueDate?: string;
  customerInfo?: CustomerInfo;
  notes?: string;
};

const paymentLinkService = new PaymentLinkService();

export class InvoiceService {
  async create(input: CreateInvoiceInput) {
    // Generate invoice number via sequence table
    const { data: seqRow, error: seqError } = await supabase
      .from("invoice_number_seq")
      .insert({})
      .select("id")
      .single();

    if (seqError) {
      logger.error({ err: seqError }, "Failed to generate invoice number");
      throw seqError;
    }

    const invoiceNumber = `INV-${String(seqRow.id).padStart(5, "0")}`;

    // Calculate totals
    const subtotal = input.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const total = subtotal; // No tax for now; could be extended

    // Create the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        merchant_id: input.merchantId,
        merchant_wallet: input.merchantWallet,
        line_items: input.lineItems,
        subtotal_usdc: subtotal,
        total_usdc: total,
        status: "draft",
        due_date: input.dueDate ?? null,
        customer_name: input.customerInfo?.name ?? null,
        customer_email: input.customerInfo?.email ?? null,
        customer_wallet: input.customerInfo?.wallet ?? null,
        notes: input.notes ?? null,
      })
      .select("*")
      .single();

    if (invoiceError) {
      logger.error({ err: invoiceError }, "Failed to create invoice");
      throw invoiceError;
    }

    // Auto-create a payment link for this invoice
    try {
      const paymentLink = await paymentLinkService.create({
        ownerType: "merchant",
        ownerWallet: input.merchantWallet,
        merchantId: input.merchantId,
        recipientWallet: input.merchantWallet,
        amountUsdc: total,
        title: `Invoice ${invoiceNumber}`,
        description: `Payment for invoice ${invoiceNumber}`,
      });

      // Attach payment link to invoice
      if (paymentLink) {
        await supabase
          .from("invoices")
          .update({
            payment_link_id: paymentLink.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoice.id);

        invoice.payment_link_id = paymentLink.id;
        (invoice as Record<string, unknown>).payment_link = paymentLink;
      }
    } catch (err) {
      logger.error({ err }, "Failed to create payment link for invoice");
      // Invoice still created, just without a payment link
    }

    return invoice;
  }

  async getById(id: string) {
    const { data } = await supabase.from("invoices").select("*").eq("id", id).single();
    return data;
  }

  async getByInvoiceNumber(invoiceNumber: string) {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("invoice_number", invoiceNumber)
      .single();
    return data;
  }

  async listByMerchant(merchantId: string, limit = 50) {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error({ err: error }, "Failed to list invoices");
      return [];
    }
    return data ?? [];
  }

  async markSent(invoiceId: string) {
    const { data, error } = await supabase
      .from("invoices")
      .update({
        status: "sent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .in("status", ["draft"])
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error, invoiceId }, "Failed to mark invoice as sent");
      return null;
    }
    return data;
  }

  async markPaid(invoiceId: string, amountUsdc: number) {
    const { data, error } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        amount_paid_usdc: amountUsdc,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error, invoiceId }, "Failed to mark invoice as paid");
      return null;
    }
    return data;
  }

  async cancel(invoiceId: string) {
    const { data, error } = await supabase
      .from("invoices")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .in("status", ["draft", "sent"])
      .select("*")
      .single();

    if (error) {
      logger.error({ err: error, invoiceId }, "Failed to cancel invoice");
      return null;
    }
    return data;
  }
}
