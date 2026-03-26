import fs from "fs";
import readline from "readline";

function toSnakeCase(str) {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

function normalizeKeys(obj) {
  if (Array.isArray(obj)) return obj.map(normalizeKeys);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [toSnakeCase(k), normalizeKeys(v)])
    );
  }
  return obj;
}

export async function parseJsonl(filePath) {
  const results = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (line.trim()) {
      results.push(normalizeKeys(JSON.parse(line)));
    }
  }
  return results;
}