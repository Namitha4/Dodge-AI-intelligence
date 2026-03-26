// backend/src/ingestion/ingestAll.js
// Run with: node src/ingestion/ingestAll.js
//
// Expects JSONL files organised as either:
//   backend/data/<entity>.jsonl          (flat layout)
//   backend/data/<entity>/<any>.jsonl    (folder layout)
//
// ALL column names are snake_case to match the migration.
// The parseJsonl normalizer handles SAP's camelCase → snake_case automatically.

import { parseJsonl } from "./parseJsonl.js";
import pool from "../config/db.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR   = path.resolve(__dirname, "../../data");

// ── Helper: load all .jsonl files from  data/<entity>.jsonl  OR  data/<entity>/
async function loadEntity(entityName) {
  const flatFile  = path.join(DATA_DIR, `${entityName}.jsonl`);
  const folderDir = path.join(DATA_DIR, entityName);
  const records   = [];

  if (fs.existsSync(flatFile)) {
    records.push(...await parseJsonl(flatFile));
  } else if (fs.existsSync(folderDir) && fs.statSync(folderDir).isDirectory()) {
    for (const f of fs.readdirSync(folderDir).filter(f => f.endsWith(".jsonl"))) {
      records.push(...await parseJsonl(path.join(folderDir, f)));
    }
  } else {
    console.warn(`[ingest] No file or folder found for entity: ${entityName} — skipping`);
  }
  return records;
}


async function ingestBusinessPartners() {
  const rows = await loadEntity("business_partners");
  let inserted = 0, skipped = 0;
  for (const r of rows) {
    if (!r.business_partner) { skipped++; continue; }
    await pool.query(
      `INSERT INTO business_partners
         (business_partner, customer, business_partner_full_name,
          business_partner_is_blocked, creation_date, raw)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (business_partner) DO NOTHING`,
      [r.business_partner, r.customer ?? null,
       r.business_partner_full_name ?? null,
       r.business_partner_is_blocked ?? null,
       r.creation_date ?? null, r]
    );
    inserted++;
  }
  console.log(`[business_partners]  inserted=${inserted}  skipped=${skipped}`);
}

async function ingestProducts() {
  const rows = await loadEntity("products");
  let inserted = 0, skipped = 0;
  for (const r of rows) {
    if (!r.product) { skipped++; continue; }
    await pool.query(
      `INSERT INTO products
         (product, product_type, product_group, gross_weight, base_unit, raw)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (product) DO NOTHING`,
      [r.product, r.product_type ?? null, r.product_group ?? null,
       r.gross_weight ?? null, r.base_unit ?? null, r]
    );
    inserted++;
  }
  console.log(`[products]  inserted=${inserted}  skipped=${skipped}`);
}

async function ingestProductDescriptions() {
  const rows = await loadEntity("product_descriptions");
  let inserted = 0, skipped = 0;
  for (const r of rows) {
    if (!r.product || !r.language) { skipped++; continue; }
    await pool.query(
      `INSERT INTO product_descriptions (product, language, product_description, raw)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (product, language) DO NOTHING`,
      [r.product, r.language, r.product_description ?? null, r]
    );
    inserted++;
  }
  console.log(`[product_descriptions]  inserted=${inserted}  skipped=${skipped}`);
}

async function ingestSalesOrderHeaders() {
  const rows = await loadEntity("sales_order_headers");
  let inserted = 0, skipped = 0;
  for (const r of rows) {
    if (!r.sales_order) { skipped++; continue; }
    await pool.query(
      `INSERT INTO sales_order_headers
         (sales_order, sales_order_type, sold_to_party, total_net_amount,
          transaction_currency, overall_delivery_status,
          creation_date, requested_delivery_date, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (sales_order) DO NOTHING`,
      [r.sales_order, r.sales_order_type ?? null, r.sold_to_party ?? null,
       r.total_net_amount ?? null, r.transaction_currency ?? null,
       r.overall_delivery_status ?? null, r.creation_date ?? null,
       r.requested_delivery_date ?? null, r]
    );
    inserted++;
  }
  console.log(`[sales_order_headers]  inserted=${inserted}  skipped=${skipped}`);
}

async function ingestSalesOrderItems() {
  const rows = await loadEntity("sales_order_items");
  let inserted = 0, skipped = 0;
  for (const r of rows) {
    if (!r.sales_order || !r.sales_order_item) { skipped++; continue; }
    await pool.query(
      `INSERT INTO sales_order_items
         (sales_order, sales_order_item, material, requested_quantity, net_amount,
          production_plant, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (sales_order, sales_order_item) DO NOTHING`,
      [r.sales_order, r.sales_order_item, r.material ?? null,
       r.requested_quantity ?? null, r.net_amount ?? null,
       r.production_plant ?? null, r]
    );
    inserted++;
  }
  console.log(`[sales_order_items]  inserted=${inserted}  skipped=${skipped}`);
}

async function ingestOutboundDeliveryItems() {
  const rows = await loadEntity("outbound_delivery_items");
  let inserted = 0, skipped = 0;
  for (const r of rows) {
    if (!r.delivery_document) { skipped++; continue; }
    if (!r.reference_sd_document) {
      console.warn(`  [warn] delivery ${r.delivery_document} has no reference_sd_document`);
    }
    await pool.query(
      `INSERT INTO outbound_delivery_items
         (delivery_document, delivery_document_item, reference_sd_document,
          reference_sd_document_item, actual_delivery_quantity, plant, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [r.delivery_document, r.delivery_document_item ?? null,
       r.reference_sd_document ?? null, r.reference_sd_document_item ?? null,
       r.actual_delivery_quantity ?? null, r.plant ?? null, r]
    );
    inserted++;
  }
  console.log(`[outbound_delivery_items]  inserted=${inserted}  skipped=${skipped}`);
}

async function ingestBillingDocumentHeaders() {
  const rows = await loadEntity("billing_document_headers");
  let inserted = 0, skipped = 0;
  for (const r of rows) {
    if (!r.billing_document) { skipped++; continue; }
    if (!r.accounting_document) {
      console.warn(`  [warn] billing ${r.billing_document} has no accounting_document`);
    }
    await pool.query(
      `INSERT INTO billing_document_headers
         (billing_document, billing_document_type, sold_to_party, total_net_amount,
          transaction_currency, billing_document_is_cancelled,
          accounting_document, creation_date, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (billing_document) DO NOTHING`,
      [r.billing_document, r.billing_document_type ?? null,
       r.sold_to_party ?? null, r.total_net_amount ?? null,
       r.transaction_currency ?? null,
       r.billing_document_is_cancelled ?? null,
       r.accounting_document ?? null, r.creation_date ?? null, r]
    );
    inserted++;
  }
  console.log(`[billing_document_headers]  inserted=${inserted}  skipped=${skipped}`);
}

async function ingestBillingDocumentItems() {
  const rows = await loadEntity("billing_document_items");
  let inserted = 0, skipped = 0;
  for (const r of rows) {
    if (!r.billing_document) { skipped++; continue; }
    await pool.query(
      `INSERT INTO billing_document_items
         (billing_document, billing_document_item, material, net_amount,
          billing_quantity, reference_sd_document, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [r.billing_document, r.billing_document_item ?? null,
       r.material ?? null, r.net_amount ?? null,
       r.billing_quantity ?? null, r.reference_sd_document ?? null, r]
    );
    inserted++;
  }
  console.log(`[billing_document_items]  inserted=${inserted}  skipped=${skipped}`);
}

async function ingestJournalEntryItems() {
  const rows = await loadEntity("journal_entry_items_accounts_receivable");
  let inserted = 0, skipped = 0;
  for (const r of rows) {
    if (!r.accounting_document) { skipped++; continue; }
    await pool.query(
      `INSERT INTO journal_entry_items
         (accounting_document, accounting_document_item, reference_document,
          amount_in_transaction_currency, transaction_currency, posting_date, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [r.accounting_document, r.accounting_document_item ?? null,
       r.reference_document ?? null,
       r.amount_in_transaction_currency ?? null,
       r.transaction_currency ?? null, r.posting_date ?? null, r]
    );
    inserted++;
  }
  console.log(`[journal_entry_items]  inserted=${inserted}  skipped=${skipped}`);
}

async function ingestPayments() {
  const rows = await loadEntity("payments_accounts_receivable");
  let inserted = 0, skipped = 0;
  for (const r of rows) {
    if (!r.accounting_document) { skipped++; continue; }
    await pool.query(
      `INSERT INTO payments_accounts_receivable
         (company_code, accounting_document, accounting_document_item,
          customer, amount_in_transaction_currency, transaction_currency,
          clearing_date, posting_date, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [r.company_code ?? null, r.accounting_document,
       r.accounting_document_item ?? null, r.customer ?? null,
       r.amount_in_transaction_currency ?? null,
       r.transaction_currency ?? null,
       r.clearing_date ?? null, r.posting_date ?? null, r]
    );
    inserted++;
  }
  console.log(`[payments_accounts_receivable]  inserted=${inserted}  skipped=${skipped}`);
}


export async function ingestAll() {
  console.log("=== Dodge Ingestion Starting ===\n");

  await ingestBusinessPartners();
  await ingestProducts();
  await ingestProductDescriptions();
  await ingestSalesOrderHeaders();
  await ingestSalesOrderItems();
  await ingestOutboundDeliveryItems();
  await ingestBillingDocumentHeaders();
  await ingestBillingDocumentItems();
  await ingestJournalEntryItems();
  await ingestPayments();

  // Health check
  console.log("\n=== Post-Ingestion Health Check ===");
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM business_partners)                                              AS business_partners,
      (SELECT COUNT(*) FROM products)                                                       AS products,
      (SELECT COUNT(*) FROM sales_order_headers)                                            AS sales_orders,
      (SELECT COUNT(*) FROM outbound_delivery_items)                                        AS delivery_items,
      (SELECT COUNT(*) FROM billing_document_headers)                                       AS billing_headers,
      (SELECT COUNT(*) FROM billing_document_items)                                         AS billing_items,
      (SELECT COUNT(*) FROM journal_entry_items)                                            AS journal_entries,
      (SELECT COUNT(*) FROM payments_accounts_receivable)                                   AS payments,
      (SELECT COUNT(*) FROM sales_order_headers      WHERE sold_to_party IS NULL)           AS soh_null_party,
      (SELECT COUNT(*) FROM billing_document_headers WHERE sold_to_party IS NULL)           AS bdh_null_party,
      (SELECT COUNT(*) FROM billing_document_headers WHERE accounting_document IS NULL)     AS bdh_null_acct
  `);
  console.table(rows[0]);
  console.log("\n=== Ingestion Complete ===");
}