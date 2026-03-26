// backend/src/chat/answerFormatter.js
// Turns raw DB rows into a human-readable answer string.
// Three cases: no rows, single row, multiple rows.

/**
 * @param {Object[]} rows - Array of result rows from PostgreSQL
 * @param {string}   userQuestion - Original question for context in the response
 * @returns {string} Human-readable answer
 */
export function formatAnswer(rows, userQuestion = "") {
  if (!rows || rows.length === 0) {
    return "No records found for your query. This could mean the data doesn't exist in the system, or the filters didn't match any entries. Try rephrasing or asking about a different time range or entity.";
  }

  if (rows.length === 1) {
    const row = rows[0];
    const entries = Object.entries(row)
      .filter(([, val]) => val !== null && val !== undefined)
      .map(([key, val]) => {
        const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        const value = formatValue(val);
        return `• ${label}: ${value}`;
      });
    return entries.join("\n");
  }

  const columns = Object.keys(rows[0]);

  if (rows.length === 1 && columns.length === 1) {
    const [key, val] = Object.entries(rows[0])[0];
    const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return `${label}: ${formatValue(val)}`;
  }

  const MAX_ROWS = 20;
  const displayRows = rows.slice(0, MAX_ROWS);
  const truncated   = rows.length > MAX_ROWS;

  const lines = displayRows.map((row, i) => {
    const values = columns
      .filter(col => row[col] !== null && row[col] !== undefined)
      .map(col => {
        const label = col.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        return `${label}: ${formatValue(row[col])}`;
      })
      .join(" | ");
    return `${i + 1}. ${values}`;
  });

  let result = lines.join("\n");
  if (truncated) {
    result += `\n\n(Showing ${MAX_ROWS} of ${rows.length} results. Refine your question to narrow down the results.)`;
  }
  return result;
}

function formatValue(val) {
  if (val === null || val === undefined) return "—";
  if (val instanceof Date) return val.toLocaleDateString("en-GB");

  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}(T|$)/.test(val)) {
    return new Date(val).toLocaleDateString("en-GB");
  }

if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '')) {
  const num = Number(val);
  if (Number.isFinite(num)) {

    if (Number.isInteger(num) && num > 99999) {
      return String(num); 
    }
    return num % 1 === 0
      ? num.toLocaleString('en-US')
      : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

  return String(val);
}