// Minimal validation to replace Pydantic models. Returns { ok, value, error }.
// Keeps behavior close to FastAPI: missing/invalid required fields -> 422-style error.

export function validate(body, schema) {
  const out = {};
  for (const [field, rule] of Object.entries(schema)) {
    let val = body?.[field];

    if (val === undefined || val === null || val === "") {
      if (rule.required) {
        return { ok: false, error: `Field '${field}' is required` };
      }
      if ("default" in rule) {
        out[field] = rule.default;
      }
      continue;
    }

    if (rule.type === "number") {
      const n = Number(val);
      if (Number.isNaN(n)) return { ok: false, error: `Field '${field}' must be a number` };
      val = n;
    } else if (rule.type === "int") {
      const n = parseInt(val, 10);
      if (Number.isNaN(n)) return { ok: false, error: `Field '${field}' must be an integer` };
      val = n;
    } else if (rule.type === "string") {
      val = String(val);
    } else if (rule.type === "email") {
      val = String(val);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
        return { ok: false, error: `Field '${field}' must be a valid email` };
      }
    } else if (rule.type === "array") {
      if (!Array.isArray(val)) return { ok: false, error: `Field '${field}' must be an array` };
    }

    if (rule.enum && !rule.enum.includes(val)) {
      return { ok: false, error: `Field '${field}' must be one of: ${rule.enum.join(", ")}` };
    }

    out[field] = val;
  }
  return { ok: true, value: out };
}
