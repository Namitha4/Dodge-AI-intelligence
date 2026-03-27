// backend/src/chat/queryPlanner.js
import { askGemini } from "./geminiClient.js";

const SCHEMA_CONTEXT = `
PostgreSQL database (public schema). All tables include a 'raw' JSONB column.

Verified Table Names (Use these EXACTLY):
- business_partners
- business_partner_addresses
- products
- product_descriptions
- product_storage_locations
- sales_order_headers
- sales_order_items
- sales_order_schedule_lines
- outbound_delivery_headers
- outbound_delivery_items
- billing_document_headers
- billing_document_items
- journal_entry_items_accounts_receivable
- payments_accounts_receivable

Join Logic:
- Orders to Partners: sales_order_headers.sold_to_party = business_partners.business_partner
- Items to Orders: sales_order_items.sales_order = sales_order_headers.sales_order
- Deliveries to Orders: outbound_delivery_items.reference_sd_document = sales_order_headers.sales_order
`;

const SYSTEM_INSTRUCTIONS = `
You are a SQL expert. Write a single valid PostgreSQL SELECT query.
Rules:
1. Return ONLY raw SQL (no markdown, no backticks).
2. Use the EXACT table names listed in the SCHEMA_CONTEXT.
3. Use table aliases (e.g., FROM business_partners bp).
4. Limit results to 100 rows.
`;

export async function planQuery(userQuestion) {
  try {
    const prompt = `${SCHEMA_CONTEXT}\n${SYSTEM_INSTRUCTIONS}\n\nQuestion: "${userQuestion}"\n\nSQL:`;
    const raw = await askGemini(prompt);
    return raw.trim()
      .replace(/^```sql\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
  } catch (err) {
    console.error("[queryPlanner] Error:", err.message);
    throw err;
  }
}
