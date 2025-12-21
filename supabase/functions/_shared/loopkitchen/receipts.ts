import { createClient } from "@supabase/supabase-js";

export interface OrderReceipt {
  id: string;
  createdAt: string;
  userId?: string;

  providerId: string;
  providerName: string;
  providerSupportUrl?: string;
  checkoutUrl: string;

  currency: string;

  subtotal?: number;
  deliveryFee?: number;
  tax?: number;
  total?: number;

  cart: Array<{
    name: string;
    quantity: number;
    unit?: string;
    providerSku?: string;
    notes?: string;
  }>;

  cartHash: string;

  status:
    | "initiated"
    | "handoff_opened"
    | "unknown"
    | "completed"
    | "failed";

  support: {
    providerSupportText: string;
    loopSupportText: string;
    loopSupportEmail: string;
  };

  disclaimerText: string;
}

// Database row type (snake_case)
interface OrderReceiptRow {
  id: string;
  created_at: string;
  user_id?: string;
  provider_id: string;
  provider_name: string;
  provider_support_url?: string;
  checkout_url: string;
  currency: string;
  subtotal?: number;
  delivery_fee?: number;
  tax?: number;
  total?: number;
  cart: any;
  cart_hash: string;
  status: string;
  support_info: any;
  disclaimer_text: string;
}

export class ReceiptManager {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async createReceipt(
    receipt: Omit<OrderReceipt, "id" | "createdAt" | "status">,
  ): Promise<OrderReceipt> {
    const row: Omit<OrderReceiptRow, "id" | "created_at"> = {
      user_id: receipt.userId,
      provider_id: receipt.providerId,
      provider_name: receipt.providerName,
      provider_support_url: receipt.providerSupportUrl,
      checkout_url: receipt.checkoutUrl,
      currency: receipt.currency,
      subtotal: receipt.subtotal,
      delivery_fee: receipt.deliveryFee,
      tax: receipt.tax,
      total: receipt.total,
      cart: receipt.cart,
      cart_hash: receipt.cartHash,
      status: "initiated",
      support_info: receipt.support,
      disclaimer_text: receipt.disclaimerText,
    };

    const { data, error } = await this.supabase
      .from("order_receipts")
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return this.mapRowToReceipt(data);
  }

  async getReceipt(id: string): Promise<OrderReceipt | null> {
    const { data, error } = await this.supabase
      .from("order_receipts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return this.mapRowToReceipt(data);
  }

  async updateStatus(
    id: string,
    status: OrderReceipt["status"],
  ): Promise<void> {
    const { error } = await this.supabase
      .from("order_receipts")
      .update({ status })
      .eq("id", id);

    if (error) throw error;
  }

  private mapRowToReceipt(row: OrderReceiptRow): OrderReceipt {
    return {
      id: row.id,
      createdAt: row.created_at,
      userId: row.user_id,
      providerId: row.provider_id,
      providerName: row.provider_name,
      providerSupportUrl: row.provider_support_url,
      checkoutUrl: row.checkout_url,
      currency: row.currency,
      subtotal: row.subtotal,
      deliveryFee: row.delivery_fee,
      tax: row.tax,
      total: row.total,
      cart: row.cart,
      cartHash: row.cart_hash,
      status: row.status as OrderReceipt["status"],
      support: row.support_info,
      disclaimerText: row.disclaimer_text,
    };
  }
}
