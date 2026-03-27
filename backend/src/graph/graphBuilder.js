import pool from "../config/db.js";

export async function buildGraph() {
  const nodes = new Map();
  const edges = [];

  try {
    // ── CUSTOMERS ──────────────────────────────────────────────────
    const { rows: partners } = await pool.query(`
      SELECT business_partner, business_partner_full_name
      FROM business_partners
    `);
    for (const p of partners) {
      nodes.set(`bp_${p.business_partner}`, {
        data: {
          id: `bp_${p.business_partner}`,
          label: p.business_partner_full_name || p.business_partner,
          type: "customer",
          rawId: p.business_partner,
        }
      });
    }

    // ── SALES ORDERS ───────────────────────────────────────────────
    const { rows: soHeaders } = await pool.query(`
      SELECT sales_order, sold_to_party, total_net_amount,
             transaction_currency, overall_delivery_status
      FROM sales_order_headers
    `);
    for (const so of soHeaders) {
      nodes.set(`so_${so.sales_order}`, {
        data: {
          id: `so_${so.sales_order}`,
          label: `SO ${so.sales_order}`,
          type: "salesOrder",
          rawId: so.sales_order,
          amount: so.total_net_amount,
          currency: so.transaction_currency,
          status: so.overall_delivery_status,
        }
      });
      if (so.sold_to_party && nodes.has(`bp_${so.sold_to_party}`)) {
        edges.push({ data: {
          id: `e_bp${so.sold_to_party}_so${so.sales_order}`,
          source: `bp_${so.sold_to_party}`,
          target: `so_${so.sales_order}`,
          label: "placed"
        }});
      }
    }

    // ── DELIVERIES ─────────────────────────────────────────────────
    const { rows: deliveryRows } = await pool.query(`
      SELECT DISTINCT delivery_document, reference_sd_document
      FROM outbound_delivery_items
      WHERE reference_sd_document IS NOT NULL
    `);
    const deliveryToSalesOrder = new Map();
    for (const d of deliveryRows) {
      deliveryToSalesOrder.set(d.delivery_document, d.reference_sd_document);
    }

    for (const [deliveryDoc, salesOrder] of deliveryToSalesOrder) {
      nodes.set(`del_${deliveryDoc}`, {
        data: {
          id: `del_${deliveryDoc}`,
          label: `Delivery ${deliveryDoc}`,
          type: "delivery",
          rawId: deliveryDoc,
        }
      });
      if (nodes.has(`so_${salesOrder}`)) {
        edges.push({ data: {
          id: `e_so${salesOrder}_del${deliveryDoc}`,
          source: `so_${salesOrder}`,
          target: `del_${deliveryDoc}`,
          label: "delivered_via"
        }});
      }
    }

    // ── BILLING DOCUMENTS ───────────────────────────────────────────
    const { rows: billingItems } = await pool.query(`
      SELECT DISTINCT billing_document, reference_sd_document
      FROM billing_document_items
      WHERE reference_sd_document IS NOT NULL
    `);
    const billingToDelivery = new Map();
    for (const bi of billingItems) {
      billingToDelivery.set(bi.billing_document, bi.reference_sd_document);
    }

    const { rows: billingHeaders } = await pool.query(`
      SELECT billing_document, sold_to_party, total_net_amount,
             transaction_currency, billing_document_is_cancelled, accounting_document
      FROM billing_document_headers
    `);
    for (const bh of billingHeaders) {
      nodes.set(`bill_${bh.billing_document}`, {
        data: {
          id: `bill_${bh.billing_document}`,
          label: `Invoice ${bh.billing_document}`,
          type: "billing",
          rawId: bh.billing_document,
          amount: bh.total_net_amount,
          currency: bh.transaction_currency,
          cancelled: bh.billing_document_is_cancelled,
          accountingDocument: bh.accounting_document,
        }
      });

      const deliveryId = billingToDelivery.get(bh.billing_document);
      if (deliveryId && nodes.has(`del_${deliveryId}`)) {
        edges.push({ data: {
          id: `e_del${deliveryId}_bill${bh.billing_document}`,
          source: `del_${deliveryId}`,
          target: `bill_${bh.billing_document}`,
          label: "billed_as"
        }});
      } else if (bh.sold_to_party && nodes.has(`bp_${bh.sold_to_party}`)) {
        edges.push({ data: {
          id: `e_bp${bh.sold_to_party}_bill${bh.billing_document}`,
          source: `bp_${bh.sold_to_party}`,
          target: `bill_${bh.billing_document}`,
          label: "billed_to"
        }});
      }
    }

    // ── PAYMENTS (USE CORRECT TABLE NAME) ───────────────────────────
    const { rows: payments } = await pool.query(`
      SELECT accounting_document, accounting_document_item,
             customer, amount_in_transaction_currency,
             transaction_currency, clearing_date
      FROM payments_accounts_receivable
    `);
    for (const pay of payments) {
      const nodeId = `pay_${pay.accounting_document}_${pay.accounting_document_item}`;
      nodes.set(nodeId, {
        data: {
          id: nodeId,
          label: `Payment ${pay.accounting_document}`,
          type: "payment",
          rawId: pay.accounting_document,
          amount: pay.amount_in_transaction_currency,
          currency: pay.transaction_currency,
          clearedOn: pay.clearing_date,
        }
      });

      const matchingBilling = billingHeaders.find(
        bh => bh.accounting_document === pay.accounting_document
      );
      if (matchingBilling && nodes.has(`bill_${matchingBilling.billing_document}`)) {
        edges.push({ data: {
          id: `e_bill${matchingBilling.billing_document}_pay${pay.accounting_document}_${pay.accounting_document_item}`,
          source: `bill_${matchingBilling.billing_document}`,
          target: nodeId,
          label: "paid_by"
        }});
      }
    }

    // ── JOURNAL ENTRIES (USE CORRECT TABLE NAME) ────────────────────
    const { rows: journals } = await pool.query(`
      SELECT accounting_document, accounting_document_item,
             reference_document, amount_in_transaction_currency, posting_date
      FROM journal_entry_items_accounts_receivable
    `);
    for (const je of journals) {
      const nodeId = `je_${je.accounting_document}_${je.accounting_document_item}`;
      nodes.set(nodeId, {
        data: {
          id: nodeId,
          label: `Journal ${je.accounting_document}`,
          type: "journal",
          rawId: je.accounting_document,
          amount: je.amount_in_transaction_currency,
          postedOn: je.posting_date,
        }
      });

      if (je.reference_document && nodes.has(`bill_${je.reference_document}`)) {
        edges.push({ data: {
          id: `e_bill${je.reference_document}_je${je.accounting_document}_${je.accounting_document_item}`,
          source: `bill_${je.reference_document}`,
          target: nodeId,
          label: "journal_entry"
        }});
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges
    };
  } catch (error) {
    console.error("[graphBuilder] Error building graph:", error.message);
    throw error;
  }
}
