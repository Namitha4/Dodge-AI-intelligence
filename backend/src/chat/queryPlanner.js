// backend/src/chat/queryPlanner.js
import { askGemini } from "./geminiClient.js";

const SCHEMA_CONTEXT = `
PostgreSQL database with the following tables (all column names are snake_case):

- dodge_app.business_partners(business_partner, customer, business_partner_full_name, business_partner_is_blocked, creation_date)
- dodge_app.products(product, product_type, product_group, gross_weight, base_unit)
- dodge_app.product_descriptions(product, language, product_description)
- dodge_app.sales_order_headers(sales_order, sales_order_type, sold_to_party, total_net_amount, transaction_currency, overall_delivery_status, creation_date, requested_delivery_date)
- dodge_app.sales_order_items(sales_order, sales_order_item, material, requested_quantity, net_amount, production_plant)
- dodge_app.outbound_delivery_items(delivery_document, delivery_document_item, reference_sd_document, actual_delivery_quantity, plant)
- dodge_app.billing_document_headers(billing_document, billing_document_type, sold_to_party, total_net_amount, transaction_currency, billing_document_is_cancelled, accounting_document, creation_date)
- dodge_app.billing_document_items(billing_document, billing_document_item, material, net_amount, billing_quantity, reference_sd_document)
- dodge_app.journal_entry_items(accounting_document, accounting_document_item, reference_document, amount_in_transaction_currency, transaction_currency, posting_date)
- dodge_app.payments_accounts_receivable(company_code, accounting_document, accounting_document_item, customer, amount_in_transaction_currency, transaction_currency, clearing_date, posting_date)

Key Joins:
- sales_order_headers.sold_to_party = business_partners.business_partner
- sales_order_items.sales_order = sales_order_headers.sales_order
- outbound_delivery_items.reference_sd_document = sales_order_headers.sales_order
- billing_document_headers.accounting_document = payments_accounts_receivable.accounting_document
`;

const SYSTEM_INSTRUCTIONS = `
You are a SQL expert for an SAP Order-to-Cash system. 
Write a single valid PostgreSQL SELECT query to answer the user's question.

Rules:
1. Return ONLY the SQL query—no explanation, no markdown, no backticks.
2. IMPORTANT: Every table name MUST be prefixed with "dodge_app.".
3. Use snake_case column names exactly as shown in the schema.
4. Always use table aliases (e.g., FROM dodge_app.business_partners bp).
5. For "trace flow" or "complete flow" queries, use DISTINCT and LIMIT 20.
6. Limit standard results to 100 rows.
7. If data is missing or the question is irrelevant, return: SELECT 'Data not available' AS message;
`;

export async function planQuery(userQuestion) {
  try {
    const prompt = `${SCHEMA_CONTEXT}\n${SYSTEM_INSTRUCTIONS}\n\nQuestion: "${userQuestion}"\n\nSQL:`;
    const raw = await askGemini(prompt);
    
    // Clean the output to ensure it's raw SQL
    return raw.trim()
      .replace(/^```sql\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
  } catch (err) {
    console.error("[queryPlanner] Error generating SQL:", err.message);
    throw err;
  }
}
