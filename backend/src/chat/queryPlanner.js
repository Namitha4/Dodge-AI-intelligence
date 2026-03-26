// backend/src/chat/queryPlanner.js
// Sends user question + full schema context to Gemini and gets back a SQL query.
// The schema must be kept in sync with 001_create_tables.sql.

import { askGemini } from "./geminiClient.js";

// This is the schema Gemini sees. Keep it accurate — wrong schema = hallucinated columns.
const SCHEMA_CONTEXT = `
PostgreSQL database with the following tables (all column names are snake_case):

business_partners(business_partner, customer, business_partner_full_name, business_partner_is_blocked, creation_date)
  -- business_partner is the primary key; used as sold_to_party in orders/billing

products(product, product_type, product_group, gross_weight, base_unit)
product_descriptions(product, language, product_description)
  -- join products → product_descriptions on product

sales_order_headers(sales_order, sales_order_type, sold_to_party, total_net_amount, transaction_currency, overall_delivery_status, creation_date, requested_delivery_date)
  -- sold_to_party → business_partners.business_partner

sales_order_items(sales_order, sales_order_item, material, requested_quantity, net_amount, production_plant)
  -- sales_order → sales_order_headers.sales_order

outbound_delivery_items(delivery_document, delivery_document_item, reference_sd_document, actual_delivery_quantity, plant)
  -- reference_sd_document → sales_order_headers.sales_order (links delivery to order)
  -- one delivery has many items; use DISTINCT delivery_document for header-level queries

billing_document_headers(billing_document, billing_document_type, sold_to_party, total_net_amount, transaction_currency, billing_document_is_cancelled, accounting_document, creation_date)
  -- accounting_document links to journal_entry_items and payments_accounts_receivable

billing_document_items(billing_document, billing_document_item, material, net_amount, billing_quantity, reference_sd_document)
  -- reference_sd_document → outbound_delivery_items.delivery_document (links billing to delivery)

journal_entry_items(accounting_document, accounting_document_item, reference_document, amount_in_transaction_currency, transaction_currency, posting_date)
  -- accounting_document → billing_document_headers.accounting_document
  -- reference_document  → billing_document_headers.billing_document

payments_accounts_receivable(company_code, accounting_document, accounting_document_item, customer, amount_in_transaction_currency, transaction_currency, clearing_date, posting_date)
  -- accounting_document → billing_document_headers.accounting_document
  -- customer → business_partners.business_partner
EXAMPLE QUERIES TO GUIDE SQL GENERATION:

Q: Which customers have unpaid invoices?
A: SELECT DISTINCT bp.business_partner_full_name, bdh.billing_document, bdh.total_net_amount
   FROM billing_document_headers bdh
   JOIN business_partners bp ON bdh.sold_to_party = bp.business_partner
   LEFT JOIN payments_accounts_receivable par ON bdh.accounting_document = par.accounting_document
   WHERE par.accounting_document IS NULL
   AND bdh.billing_document_is_cancelled = FALSE;

Q: List all unpaid invoices
A: SELECT bdh.billing_document, bdh.sold_to_party, bdh.total_net_amount, bdh.creation_date
   FROM billing_document_headers bdh
   LEFT JOIN payments_accounts_receivable par ON bdh.accounting_document = par.accounting_document
   WHERE par.accounting_document IS NULL
   AND bdh.billing_document_is_cancelled = FALSE;

Q: Show outstanding payments
A: SELECT bp.business_partner_full_name, SUM(bdh.total_net_amount) AS outstanding_amount
   FROM billing_document_headers bdh
   JOIN business_partners bp ON bdh.sold_to_party = bp.business_partner
   LEFT JOIN payments_accounts_receivable par ON bdh.accounting_document = par.accounting_document
   WHERE par.accounting_document IS NULL
   AND bdh.billing_document_is_cancelled = FALSE
   GROUP BY bp.business_partner_full_name;

Key join chain (Order-to-Cash flow):
  business_partners
    → sales_order_headers       (on business_partner = sold_to_party)
    → outbound_delivery_items   (on sales_order = reference_sd_document)
    → billing_document_items    (on delivery_document = reference_sd_document)
    → billing_document_headers  (on billing_document)
    → journal_entry_items       (on accounting_document)
    → payments_accounts_receivable (on accounting_document)
`;

const SYSTEM_INSTRUCTIONS = `
You are a SQL expert for an SAP Order-to-Cash system. Given the schema above, 
write a single valid PostgreSQL SELECT query to answer the user's question.

Rules:
Return ONLY the SQL query, no explanation, no markdown, no backticks.

IMPORTANT RULES:
- For "trace full flow" or "show complete flow" queries, always use DISTINCT and limit to unique rows
- Never return duplicate rows — use DISTINCT or GROUP BY when joining multiple tables
- For flow trace queries, add LIMIT 20 to avoid cartesian products
- Use snake_case column names exactly as shown in the schema.
- Always use table aliases for clarity in JOINs.
- Limit results to 100 rows unless the question asks for totals/aggregates.
- Never use DROP, INSERT, UPDATE, DELETE, or DDL statements.
- For "least" or "minimum" queries, if multiple results tie at the same minimum value, return ALL of them, not just one.
- For questions filtering by count (e.g. "partners with 1 order"), always use HAVING COUNT(...) = N in GROUP BY queries, never WHERE count = N.
- For "every X with Y" questions, return ALL matching rows without LIMIT.
- If the question requires data not in the schema, write: SELECT 'Data not available' AS message;
`;

export async function planQuery(userQuestion) {
  const prompt = `${SCHEMA_CONTEXT}\n${SYSTEM_INSTRUCTIONS}\n\nQuestion: "${userQuestion}"\n\nSQL:`;
  const raw = await askGemini(prompt);
  // Strip any accidental markdown fences
  return raw.trim().replace(/^```sql\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}