import { askGemini } from "./geminiClient.js";

const OFF_TOPIC_PATTERNS = [
  /write me a (poem|song|story|haiku)/i,
  /tell me a joke/i,
  /what('s| is) the weather/i,
  /recommend (a |some )?(movie|book|restaurant|recipe)/i,
  /translate .+ to/i,
  /who (won|is winning) .+(game|match|championship)/i,
  /how (do i|to) cook/i,
  /what is the capital/i,
];

const O2C_KEYWORDS = [
  "order", "customer", "invoice", "payment", "delivery", "billing",
  "product", "journal", "revenue", "shipment", "sales", "account",
  "partner", "amount", "quantity", "status", "unpaid", "outstanding"
];

export async function checkGuardrails(question) {
  const lower = question.toLowerCase();

  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(question)) {
      return {
        allowed: false,
        reason: "I can only answer questions about Order-to-Cash data — sales orders, deliveries, invoices, payments, customers, and products.",
      };
    }
  }

  if (O2C_KEYWORDS.some(kw => lower.includes(kw))) {
    return { allowed: true };
  }

  return { allowed: true };
}