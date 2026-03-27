// backend/src/chat/queryPlanner.js
import { askGemini } from "./geminiClient.js";

const SCHEMA_CONTEXT = `
PostgreSQL Database Schema (public):

1. business_partners: (business_partner, business_partner_full_name)
2. sales_order_headers: (sales_order, sold_to_party, total_net_amount, overall_delivery_status)
3. outbound_delivery_items: (delivery_document, reference_sd_document) -- reference_sd_document is the Sales Order
4. billing_document_headers: (billing_document, sold_to_party, total_net_amount, accounting_document)
5. billing_document_items: (billing_document, reference_sd_document) -- reference_sd_document is the Delivery or Sales Order
6. journal_entry_items_accounts_receivable: (accounting_document, reference_document, amount_in_transaction_currency, posting_date)
7. payments_accounts_receivable: (accounting_document, customer, amount_in_transaction_currency, clearing_date)

JOIN PATHS (CRITICAL):
- Full Flow: sales_order_headers -> outbound_delivery_items (on sales_order = reference_sd_document) -> billing_document_items (on delivery_document = reference_sd_document) -> journal_entry_items_accounts_receivable (on billing_document = reference_document)
- Unpaid Invoices: billing_document_headers LEFT JOIN payments_accounts_receivable ON billing_document_headers.accounting_document = payments_accounts_receivable.accounting_document WHERE payments_accounts_receivable.accounting_document IS NULL
`;

const SYSTEM_INSTRUCTIONS = `
You are a SQL expert for the Dodge AI SAP system. 
1. Return ONLY raw SQL. No markdown, no backticks.
2. Use EXACT table names (e.g., journal_entry_items_accounts_receivable).
3. If asked for "unpaid" or "outstanding", use a LEFT JOIN between billing and payments and check for NULL payments.
4. For "full flow", trace from sales_order_headers down to journal_entry_items_accounts_receivable.
5. Limit results to 50 rows for performance.
6. GUARDRAIL: If the question is not about SAP, Orders, Deliveries, Invoices, or Payments, respond with: "This system is designed to answer questions related to the provided dataset only."
`;

export async function planQuery(userQuestion) {
  try {
    const prompt = `${SCHEMA_CONTEXT}\n${SYSTEM_INSTRUCTIONS}\n\nQuestion: "${userQuestion}"\n\nSQL:`;
    const raw = await askGemini(prompt);
    
    // Cleanup any LLM chatter
    let cleanSql = raw.trim().replace(/^```sql\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    
    // Check Guardrail
    if (!cleanSql.toUpperCase().startsWith("SELECT")) {
        return cleanSql; // Return the guardrail message
    }
    
    return cleanSql;
  } catch (err) {
    console.error("[queryPlanner] Error:", err.message);
    throw err;
  }
}
