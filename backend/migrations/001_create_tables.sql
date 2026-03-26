-- =============================================================
-- O2C Graph System — Migration 001
-- Run with: psql -U <user> -d <dbname> -f 001_create_tables.sql
-- All columns are snake_case. Do NOT use camelCase anywhere.
-- =============================================================
DROP TABLE IF EXISTS outbound_delivery_headers;
DROP TABLE IF EXISTS payments_accounts_receivable CASCADE;
DROP TABLE IF EXISTS journal_entry_items CASCADE;
DROP TABLE IF EXISTS billing_document_items CASCADE;
DROP TABLE IF EXISTS billing_document_headers CASCADE;
DROP TABLE IF EXISTS outbound_delivery_items CASCADE;
DROP TABLE IF EXISTS sales_order_items CASCADE;
DROP TABLE IF EXISTS sales_order_headers CASCADE;
DROP TABLE IF EXISTS product_descriptions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS business_partners CASCADE;

-- -------------------------------------------------------------
CREATE TABLE business_partners (
    id                          SERIAL PRIMARY KEY,
    business_partner            VARCHAR(20) NOT NULL UNIQUE,
    customer                    VARCHAR(20),
    business_partner_full_name  VARCHAR(255),
    business_partner_is_blocked BOOLEAN,
    creation_date               DATE,
    raw                         JSONB
);

-- -------------------------------------------------------------
CREATE TABLE products (
    id            SERIAL PRIMARY KEY,
    product       VARCHAR(50) NOT NULL UNIQUE,
    product_type  VARCHAR(20),
    product_group VARCHAR(50),
    gross_weight  NUMERIC(12,3),
    base_unit     VARCHAR(10),
    raw           JSONB
);

-- -------------------------------------------------------------
CREATE TABLE product_descriptions (
    id                  SERIAL PRIMARY KEY,
    product             VARCHAR(50) NOT NULL,
    language            VARCHAR(5)  NOT NULL,
    product_description VARCHAR(255),
    raw                 JSONB,
    UNIQUE(product, language)
);

-- -------------------------------------------------------------
CREATE TABLE sales_order_headers (
    id                      SERIAL PRIMARY KEY,
    sales_order             VARCHAR(20) NOT NULL UNIQUE,
    sales_order_type        VARCHAR(10),
    sold_to_party           VARCHAR(20),
    total_net_amount        NUMERIC(18,2),
    transaction_currency    VARCHAR(5),
    overall_delivery_status VARCHAR(5),
    creation_date           DATE,
    requested_delivery_date DATE,
    raw                     JSONB
);
CREATE INDEX idx_soh_sold_to_party ON sales_order_headers(sold_to_party);

-- -------------------------------------------------------------
CREATE TABLE sales_order_items (
    id                 SERIAL PRIMARY KEY,
    sales_order        VARCHAR(20) NOT NULL,
    sales_order_item   VARCHAR(10) NOT NULL,
    material           VARCHAR(50),
    requested_quantity NUMERIC(12,3),
    net_amount         NUMERIC(18,2),
    production_plant   VARCHAR(10),
    raw                JSONB,
    UNIQUE(sales_order, sales_order_item)
);
CREATE INDEX idx_soi_sales_order ON sales_order_items(sales_order);

-- -------------------------------------------------------------
-- NOTE: No outbound_delivery_headers table in this dataset.
-- Delivery nodes are built from DISTINCT delivery_document in items.
-- -------------------------------------------------------------
CREATE TABLE outbound_delivery_items (
    id                         SERIAL PRIMARY KEY,
    delivery_document          VARCHAR(20) NOT NULL,
    delivery_document_item     VARCHAR(10),
    reference_sd_document      VARCHAR(20),
    reference_sd_document_item VARCHAR(10),
    actual_delivery_quantity   NUMERIC(12,3),
    plant                      VARCHAR(10),
    raw                        JSONB
);
CREATE INDEX idx_odi_delivery_document     ON outbound_delivery_items(delivery_document);
CREATE INDEX idx_odi_reference_sd_document ON outbound_delivery_items(reference_sd_document);

-- -------------------------------------------------------------
CREATE TABLE billing_document_headers (
    id                            SERIAL PRIMARY KEY,
    billing_document              VARCHAR(20) NOT NULL UNIQUE,
    billing_document_type         VARCHAR(10),
    sold_to_party                 VARCHAR(20),
    total_net_amount              NUMERIC(18,2),
    transaction_currency          VARCHAR(5),
    billing_document_is_cancelled BOOLEAN,
    accounting_document           VARCHAR(20),
    creation_date                 DATE,
    raw                           JSONB
);
CREATE INDEX idx_bdh_accounting_document ON billing_document_headers(accounting_document);
CREATE INDEX idx_bdh_sold_to_party       ON billing_document_headers(sold_to_party);

-- -------------------------------------------------------------
CREATE TABLE billing_document_items (
    id                    SERIAL PRIMARY KEY,
    billing_document      VARCHAR(20) NOT NULL,
    billing_document_item VARCHAR(10),
    material              VARCHAR(50),
    net_amount            NUMERIC(18,2),
    billing_quantity      NUMERIC(12,3),
    reference_sd_document VARCHAR(20),
    raw                   JSONB
);
CREATE INDEX idx_bdi_billing_document      ON billing_document_items(billing_document);
CREATE INDEX idx_bdi_reference_sd_document ON billing_document_items(reference_sd_document);

-- -------------------------------------------------------------
CREATE TABLE journal_entry_items (
    id                             SERIAL PRIMARY KEY,
    accounting_document            VARCHAR(20) NOT NULL,
    accounting_document_item       VARCHAR(10),
    reference_document             VARCHAR(20),
    amount_in_transaction_currency NUMERIC(18,2),
    transaction_currency           VARCHAR(5),
    posting_date                   DATE,
    raw                            JSONB
);
CREATE INDEX idx_jei_accounting_document ON journal_entry_items(accounting_document);
CREATE INDEX idx_jei_reference_document  ON journal_entry_items(reference_document);

-- -------------------------------------------------------------
CREATE TABLE payments_accounts_receivable (
    id                             SERIAL PRIMARY KEY,
    company_code                   VARCHAR(10),
    accounting_document            VARCHAR(20) NOT NULL,
    accounting_document_item       VARCHAR(10),
    customer                       VARCHAR(20),
    amount_in_transaction_currency NUMERIC(18,2),
    transaction_currency           VARCHAR(5),
    clearing_date                  DATE,
    posting_date                   DATE,
    raw                            JSONB
);
CREATE INDEX idx_par_accounting_document ON payments_accounts_receivable(accounting_document);
CREATE INDEX idx_par_customer            ON payments_accounts_receivable(customer);

-- =============================================================
-- Validation query — uncomment and run after ingestion
-- =============================================================
-- SELECT
--   (SELECT COUNT(*) FROM business_partners)                                              AS business_partners,
--   (SELECT COUNT(*) FROM products)                                                       AS products,
--   (SELECT COUNT(*) FROM sales_order_headers)                                            AS sales_orders,
--   (SELECT COUNT(*) FROM outbound_delivery_items)                                        AS delivery_items,
--   (SELECT COUNT(*) FROM billing_document_headers)                                       AS billing_headers,
--   (SELECT COUNT(*) FROM journal_entry_items)                                            AS journal_entries,
--   (SELECT COUNT(*) FROM payments_accounts_receivable)                                   AS payments,
--   (SELECT COUNT(*) FROM sales_order_headers     WHERE sold_to_party IS NULL)            AS soh_null_party,
--   (SELECT COUNT(*) FROM billing_document_headers WHERE sold_to_party IS NULL)           AS bdh_null_party,
--   (SELECT COUNT(*) FROM billing_document_headers WHERE accounting_document IS NULL)     AS bdh_null_acct;