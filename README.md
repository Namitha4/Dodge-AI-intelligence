# Dodge AI Intelligence ⬡

An AI-powered Graph Intelligence system designed to unify fragmented SAP Order-to-Cash (O2C) data into a traceable, queryable engine.

## 🏗 Architecture & Design Decisions

### 1. Data Modeling: The Context Graph
The core challenge was connecting siloed tables (Orders, Deliveries, Invoices, Payments). 
- **Graph Construction:** I utilized a relational-to-graph mapping strategy. Instead of a standard flat join, the system treats each document as a **Node** and its SAP reference fields (`reference_sd_document`, `accounting_document`) as **Edges**.
- **Traceability:** This allows for "Full Flow" tracing (Sales Order → Delivery → Billing → Journal Entry) by traversing these defined relationships.

### 2. Database: PostgreSQL (Render)
- **Choice:** I chose **PostgreSQL** for its strong relational integrity and **JSONB** support. 
- **Flexibility:** Every table includes a `raw` JSONB column. This serves as a "fallback" for the AI, allowing it to access fields that may not have been explicitly mapped to a column during ingestion, ensuring the system is resilient to schema changes.

### 3. LLM Strategy: Gemini Flash + Schema Context
- **Prompting:** I implemented a **Schema-Aware Query Planner**. The system injects the current database schema and specific "Join Paths" into the prompt.
- **Dynamic SQL:** The AI (Gemini Flash) acts as a translator, converting natural language into optimized PostgreSQL queries tailored to our custom O2C table names.

### 4. Guardrails & Security
- **Domain Restriction:** To prevent misuse (e.g., general knowledge questions), a dedicated guardrail layer was added to the System Instructions. If a query is off-topic, the AI triggers a standardized refusal: *"This system is designed to answer questions related to the provided dataset only."*

---

## 🛠 Tech Stack
- **Backend:** Node.js, Express
- **Database:** [PostgreSQL on Render](https://dashboard.render.com/d/dpg-d72kp9h4tr6s73bi8mjg-a)
- **AI:** Google Gemini Flash 1.5
- **Frontend:** Vanilla JS + Cytoscape.js/D3 (Graph Visualization)
- **Deployment:** [Vercel (Frontend)](https://dodge-ai-intelligence.vercel.app/) & [Render (Backend)](https://dashboard.render.com/web/srv-d72jiuggjchc73861sd0)

## 🚀 Setup & Installation

1. **Clone & Install:**
   ```bash
   git clone https://github.com/Namitha4/Dodge-AI-intelligence.git
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file with `DATABASE_URL` and `GEMINI_API_KEY`.

3. **Data Ingestion:**
   Run the rebuild script to populate the cloud database:
   ```bash
   node backend/src/ingestion/auto_rebuild.js
   ```

4. **Start App:**
   ```bash
   npm start
   ```
   
5. API Resilience & Scalability
Quota Management: To handle the Free Tier limitations of Gemini 2.5 Flash, I implemented an asynchronous retry loop with a multi-model fallback strategy. The system attempts to use gemini-2.5-flash first and automatically rotates if a 429 (Rate Limit) error is detected.

Optimized Schema Context: The schema provided to the LLM is token-optimized. By providing only essential column mappings and join paths, the system stays well within the Tokens Per Minute (TPM) limits while maintaining high SQL accuracy.

Guardrail Performance: The guardrail logic is integrated directly into the planQuery response handler. This prevents unnecessary database overhead by rejecting off-topic prompts before they reach the SQL execution layer.
---

## 📊 Evaluation Queries (Try These)
- **Traceability:** *"Trace the full flow of billing document 90504248"*
- **Financials:** *"Which customers have unpaid invoices?"*
- **Gap Analysis:** *"Show sales orders delivered but not billed"*

  


