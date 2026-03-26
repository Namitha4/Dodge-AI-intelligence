import express from "express";
import { buildGraph } from "../graph/graphBuilder.js";
import pool from "../config/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const graph = await buildGraph();
    res.json(graph);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Add this route below the existing GET /
router.get("/nodes-for-materials", async (req, res) => {
  try {
    const materials = (req.query.materials || "").split(",").filter(Boolean);
    if (materials.length === 0) return res.json({ nodeIds: [] });

    const { rows } = await pool.query(`
      SELECT DISTINCT soi.sales_order
      FROM sales_order_items soi
      WHERE soi.material = ANY($1)
    `, [materials]);

    const nodeIds = rows.map(r => `so_${r.sales_order}`);
    res.json({ nodeIds });
  } catch (err) {
    res.status(500).json({ nodeIds: [] });
  }
});

// Lookup node IDs by business partner names
router.get("/nodes-for-customers", async (req, res) => {
  try {
    const names = (req.query.names || "").split("|").filter(Boolean);
    if (names.length === 0) return res.json({ nodeIds: [] });

    const { rows } = await pool.query(`
      SELECT business_partner
      FROM business_partners
      WHERE business_partner_full_name = ANY($1)
    `, [names]);

    const nodeIds = rows.map(r => `bp_${r.business_partner}`);
    res.json({ nodeIds });
  } catch (err) {
    res.status(500).json({ nodeIds: [] });
  }
});

export default router;