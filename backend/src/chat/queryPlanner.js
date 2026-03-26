// backend/src/chat/queryPlanner.js
import { askGemini } from "./geminiClient.js";

const SCHEMA_CONTEXT = `
PostgreSQL database (public schema). All tables include a 'raw' JSONB column.

Tables & Key Columns (Verified from Data):
- business_partners: business_partner, business_partner_full_name, business_partner_category
- sales_order_headers: sales_order, sold_to_party, total_net_amount, overall_delivery_status
- products: product, product_type, product_group
- sales_order_items: sales_order, material, requested_quantity

Join Logic (Crucial):
- Orders -> Customers: sales_order_headers.sold_to_party = business_partners.business_partner
- Items -> Orders: sales_order_items.sales_order = sales_order_headers.sales_order
- Items -> Products: sales_order_items.material = products.product
`;

const SYSTEM_INSTRUCTIONS = `
You are a SQL expert. Write a single valid PostgreSQL SELECT query.
1. Return ONLY raw SQL (no markdown, no backticks).
2. Use standard table names (no dodge_app. prefix).
3. Use table aliases (e.g., FROM business_partners bp).
4. If a column is missing, check the 'raw' JSONB column.
5. Limit results to 100 rows.
`;

export async function planQuery(userQuestion) {
  try {
    const prompt = `${SCHEMA_CONTEXT}\n${SYSTEM_INSTRUCTIONS}\n\nQuestion: "${userQuestion}"\n\nSQL:`;
    const raw = await askGemini(prompt);
    return raw.trim().replace(/^```sql\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  } catch (err) {
    console.error("[queryPlanner] Error:", err.message);
    throw err;
  }
}
