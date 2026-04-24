// Invoice Sender Service — FactureSmart COD-46
// Unified service for sending invoices via Email and WhatsApp
// With delivery tracking in the invoice_deliveries table

import { supabase } from '@/integrations/supabase/client';
import { emailService } from './email';
import { whatsAppService } from './whatsapp';
import { generateFacturePDF } from '@/utils/pdfGenerator';
import { APP_URL } from '@/lib/constants';
import type { Facture, InvoiceDelivery, SendInvoiceResult } from '@/types';

export interface SendInvoiceOptions {
  invoice: Facture;
  channel: 'email' | 'whatsapp';
  recipientEmail?: string;
  recipientPhone?: string;
  attachPdf?: boolean;        // Include PDF as attachment (email only)
  includeDownloadLink?: boolean; // Include download link in message
  userId: string;              // auth.uid() of sender
}

/**
 * Create a delivery record in DB and return the download URL
 */
async function createDeliveryRecord(
  params: {
    invoiceId: string;
    channel: 'email' | 'whatsapp';
    recipientEmail?: string;
    recipientPhone?: string;
    subject?: string;
    bodyPreview?: string;
    pdfAttached: boolean;
    userId: string;
  }
): Promise<{ record: InvoiceDelivery; downloadUrl: string } | null> {
  const { data, error } = await supabase.rpc('create_invoice_delivery', {
    p_invoice_id: params.invoiceId,
    p_channel: params.channel,
    p_recipient_email: params.recipientEmail || null,
    p_recipient_phone: params.recipientPhone || null,
    p_subject: params.subject || null,
    p_body_preview: params.bodyPreview || null,
    p_pdf_attached: params.pdfAttached,
    p_created_by: params.userId,
  });

  if (error || !data) {
    console.error('[InvoiceSender] Failed to create delivery record:', error);
    return null;
  }

  const record = data as InvoiceDelivery;
  const downloadUrl = `${APP_URL}/download/${record.download_token}`;
  return { record, downloadUrl };
}

/**
 * Format invoice amount for display
 */
function formatAmount(facture: Facture): string {
  const currency = facture.devise === 'USD' ? '$' : 'FC';
  return `${currency} ${facture.total_general.toFixed(2)}`;
}

/**
 * Format status label
 */
function formatStatusLabel(statut: string): string {
  const labels: Record<string, string> = {
    brouillon: 'Brouillon',
    en_attente: 'En attente',
    validee: 'Validée',
    payee: 'Payée',
    annulee: 'Annulée',
  };
  return labels[statut] || statut;
}

/**
 * Send invoice via Email
 */
async function sendViaEmail(
  invoice: Facture,
  recipientEmail: string,
  attachPdf: boolean,
  includeDownloadLink: boolean,
  userId: string
): Promise<SendInvoiceResult> {
  const clientName = invoice.clients?.nom || invoice.client?.nom || 'Client';
  const invoiceNumber = invoice.facture_number;
  const amount = formatAmount(invoice);
  const status = formatStatusLabel(invoice.statut);
  const fileName = `${clientName} - ${invoiceNumber}.pdf`;

  // Create delivery record (without PDF first)
  const delivery = await createDeliveryRecord({
    invoiceId: invoice.id,
    channel: 'email',
    recipientEmail,
    subject: `Facture ${invoiceNumber}`,
    bodyPreview: `Facture ${invoiceNumber} - ${amount} - ${status}`,
    pdfAttached: attachPdf,
    userId,
  });

  if (!delivery) {
    return { success: false, error: 'Failed to create delivery record' };
  }

  const { record, downloadUrl } = delivery;

  if (attachPdf) {
    // Generate PDF blob and attach
    const pdfBlob = await generateFacturePDF(invoice, true) as Blob;
    const result = await emailService.sendInvoiceWithPDF(
      recipientEmail,
      invoiceNumber,
      amount,
      status,
      pdfBlob,
      fileName,
      includeDownloadLink ? downloadUrl : undefined
    );

    // Update record with provider response
    if (result.success) {
      await supabase.rpc('update_invoice_delivery_status', {
        p_id: record.id,
        p_status: 'sent',
        p_provider_message_id: result.id,
        p_provider_response: { id: result.id },
      }).catch(console.error);
    }

    return {
      success: result.success,
      delivery_id: record.id,
      message_id: result.id,
      download_url: downloadUrl,
      error: result.error,
    };
  } else {
    // Send without PDF, just with download link
    const result = await emailService.sendInvoiceNotification(
      recipientEmail,
      invoiceNumber,
      amount,
      status
    );

    if (result.success) {
      await supabase.rpc('update_invoice_delivery_status', {
        p_id: record.id,
        p_status: 'sent',
        p_provider_message_id: result.id,
        p_provider_response: { id: result.id },
      }).catch(console.error);
    }

    return {
      success: result.success,
      delivery_id: record.id,
      message_id: result.id,
      download_url: includeDownloadLink ? downloadUrl : undefined,
      error: result.error,
    };
  }
}

/**
 * Send invoice via WhatsApp
 */
async function sendViaWhatsApp(
  invoice: Facture,
  recipientPhone: string,
  attachPdf: boolean,
  includeDownloadLink: boolean,
  userId: string
): Promise<SendInvoiceResult> {
  const clientName = invoice.clients?.nom || invoice.client?.nom || 'Client';
  const invoiceNumber = invoice.facture_number;
  const amount = formatAmount(invoice);
  const status = formatStatusLabel(invoice.statut);
  const fileName = `${clientName} - ${invoiceNumber}.pdf`;

  // Create delivery record
  const delivery = await createDeliveryRecord({
    invoiceId: invoice.id,
    channel: 'whatsapp',
    recipientPhone,
    bodyPreview: `Facture ${invoiceNumber} - ${amount} - ${status}`,
    pdfAttached: attachPdf,
    userId,
  });

  if (!delivery) {
    return { success: false, error: 'Failed to create delivery record' };
  }

  const { record, downloadUrl } = delivery;

  if (attachPdf) {
    // TODO (COD-46): Upload PDF to Supabase Storage and send as WhatsApp document
    // For now, WhatsApp requires a public URL — fall back to link-only
    // const pdfUrl = await uploadPdfToStorage(invoice);
    const result = await whatsAppService.sendInvoiceNotification(
      recipientPhone,
      invoiceNumber,
      amount,
      status,
      downloadUrl // Send as link until PDF hosting is implemented
    );

    if (result.success) {
      await supabase.rpc('update_invoice_delivery_status', {
        p_id: record.id,
        p_status: 'sent',
        p_provider_message_id: result.message_id,
        p_provider_response: { message_id: result.message_id },
      }).catch(console.error);
    }

    return {
      success: result.success,
      delivery_id: record.id,
      message_id: result.message_id,
      download_url: downloadUrl,
      error: result.error,
    };
  } else {
    // Text message with download link
    const result = await whatsAppService.sendInvoiceNotification(
      recipientPhone,
      invoiceNumber,
      amount,
      status,
      downloadUrl
    );

    if (result.success) {
      await supabase.rpc('update_invoice_delivery_status', {
        p_id: record.id,
        p_status: 'sent',
        p_provider_message_id: result.message_id,
        p_provider_response: { message_id: result.message_id },
      }).catch(console.error);
    }

    return {
      success: result.success,
      delivery_id: record.id,
      message_id: result.message_id,
      download_url: downloadUrl,
      error: result.error,
    };
  }
}

// ──────────────────────────────────────────────
// Main InvoiceSender class
// ──────────────────────────────────────────────

export class InvoiceSenderService {

  /**
   * Send an invoice via the specified channel
   */
  async send(options: SendInvoiceOptions): Promise<SendInvoiceResult> {
    const { invoice, channel, recipientEmail, recipientPhone, attachPdf = true, includeDownloadLink = true, userId } = options;

    // Validate
    if (!invoice?.id) {
      return { success: false, error: 'Invalid invoice' };
    }
    if (channel === 'email' && !recipientEmail) {
      return { success: false, error: 'Recipient email is required' };
    }
    if (channel === 'whatsapp' && !recipientPhone) {
      return { success: false, error: 'Recipient phone is required' };
    }
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    try {
      if (channel === 'email') {
        return await sendViaEmail(invoice, recipientEmail!, attachPdf, includeDownloadLink, userId);
      } else {
        return await sendViaWhatsApp(invoice, recipientPhone!, attachPdf, includeDownloadLink, userId);
      }
    } catch (err) {
      console.error('[InvoiceSender] Unexpected error:', err);
      return { success: false, error: 'Unexpected error during sending' };
    }
  }

  /**
   * Get delivery history for an invoice
   */
  async getDeliveryHistory(invoiceId: string): Promise<InvoiceDelivery[]> {
    const { data, error } = await supabase
      .from('invoice_deliveries')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[InvoiceSender] Failed to get delivery history:', error);
      return [];
    }
    return (data as InvoiceDelivery[]) || [];
  }

  /**
   * Check if WhatsApp is configured
   */
  isWhatsAppConfigured(): boolean {
    return whatsAppService.isConfigured();
  }
}

export const invoiceSenderService = new InvoiceSenderService();
