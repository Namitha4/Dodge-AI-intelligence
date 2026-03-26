// backend/src/routes/chat.js
import express        from "express";
import { planQuery }  from "../chat/queryPlanner.js";
import { checkGuardrails } from "../chat/guardrails.js";  // async now
import { formatAnswer }    from "../chat/answerFormatter.js";
import pool           from "../config/db.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { question } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ error: "No question provided." });
  }

  const { allowed, reason } = await checkGuardrails(question);
  if (!allowed) {
    return res.json({ answer: reason, sql: null });
  }

  let sql;
  try {
    sql = await planQuery(question);
  } catch (err) {
    console.error("[chat] Query planning failed:", err.message);
    return res.status(500).json({ error: "Failed to interpret your question. Please try rephrasing." });
  }

  let rows;
  try {
    const result = await pool.query(sql);
    rows = result.rows;
  } catch (err) {
    console.error("[chat] SQL execution failed:", err.message, "\nSQL:", sql);
    return res.status(500).json({
      error: "The query ran into an error. The question may be too complex or reference data that doesn't exist.",
      sql,
    });
  }

  const answer = formatAnswer(rows, question);
  res.json({ answer, sql });
});

export default router;