import type { PolicyDecision } from "@/lib/dashboard/types";

/**
 * Deterministic policy evaluation. No model opinions here — policies are
 * data, evaluation is pure, and the strictest applicable policy always wins
 * (deny > require_approval > flag > allow). Tools without a policy default to
 * allow; risky tools get a require_approval policy auto-created at discovery.
 *
 * Conditions use three-valued logic: a clause is true, false, or
 * INDETERMINATE (null) when the referenced argument is missing or can't be
 * coerced for the operator. Indeterminate fails CLOSED — the guarded policy
 * is treated as applicable — so an agent cannot dodge a `amount > 100` gate
 * by omitting or reshaping `amount`.
 *
 * Conditions can also reference injected context vars (PRD §10): `project_root`
 * (the server's filesystem scope), `action` (the raw tool name), `tainted`
 * (untrusted data ingested recently), and `risk`. Supported clause forms:
 *   field == "x" | != | > | >= | < | <=        — scalar comparison
 *   field startsWith "x"                        — string prefix (path scoping)
 *   field in ["a", "b"]                         — membership
 *   not <clause>                                — negation
 * joined with `and`.
 */

const RANK: Record<PolicyDecision, number> = {
  allow: 1,
  flag: 2,
  require_approval: 3,
  deny: 4,
};

export interface PolicyLike {
  decision: PolicyDecision;
  condition?: string | null;
}

/** Extra identifiers available to conditions beyond the call arguments. */
export interface PolicyScope {
  project_root?: string;
  action?: string;
  tainted?: boolean;
  risk?: string;
}

function evalScope(args: Record<string, unknown>, scope?: PolicyScope): Record<string, unknown> {
  if (!scope) return args;
  const merged: Record<string, unknown> = { ...args };
  for (const [k, v] of Object.entries(scope)) {
    if (v !== undefined && !(k in merged)) merged[k] = v;
  }
  return merged;
}

/**
 * Evaluate a tool's policies against the call arguments. A policy applies
 * unless its condition evaluates to a definitive `false`; an unparseable or
 * indeterminate condition still applies (fail closed).
 */
export function evaluatePolicy<T extends PolicyLike>(
  policies: T[],
  args: Record<string, unknown>,
  scope?: PolicyScope,
): { decision: PolicyDecision; policy: T | null } {
  const ctx = evalScope(args, scope);
  let winner: T | null = null;
  for (const policy of policies) {
    const applies = policy.condition ? evalCondition(policy.condition, ctx) !== false : true;
    if (!applies) continue;
    if (!winner || RANK[policy.decision] > RANK[winner.decision]) winner = policy;
  }
  return { decision: winner?.decision ?? "allow", policy: winner };
}

/**
 * Effective decision for display, ignoring conditions: a conditional policy
 * is shown at its decision so the user sees the strictest possible outcome.
 */
export function resolveDisplayPolicy<T extends PolicyLike & { exposedTool: string }>(
  policies: T[],
  exposedTool: string,
): { decision: PolicyDecision; policy: T | null } {
  let winner: T | null = null;
  for (const policy of policies) {
    if (policy.exposedTool !== exposedTool) continue;
    if (!winner || RANK[policy.decision] > RANK[winner.decision]) winner = policy;
  }
  return { decision: winner?.decision ?? "allow", policy: winner };
}

const COMPARE_RE = /^([\w.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/;
const STARTSWITH_RE = /^([\w.]+)\s+startsWith\s+(.+)$/;
const IN_RE = /^([\w.]+)\s+in\s+\[(.*)\]$/;

/**
 * Syntactic check only: are all clauses well-formed? Used to validate a
 * policy at authoring time, independent of any arguments.
 */
export function isParseableCondition(condition: string): boolean {
  return condition.split(/\s+and\s+/i).every((raw) => {
    const clause = raw.trim().replace(/^not\s+/i, "").trim();
    return COMPARE_RE.test(clause) || STARTSWITH_RE.test(clause) || IN_RE.test(clause);
  });
}

/**
 * Evaluate a condition. Returns true, false, or null (indeterminate →
 * callers fail closed). See the module comment for grammar.
 */
export function evalCondition(condition: string, args: Record<string, unknown>): boolean | null {
  let indeterminate = false;
  for (const raw of condition.split(/\s+and\s+/i)) {
    const result = evalClause(raw.trim(), args);
    if (result === false) return false; // a definitive false short-circuits the AND
    if (result === null) indeterminate = true; // remember, but keep scanning for a false
  }
  return indeterminate ? null : true;
}

/** One clause → true | false | null. Handles a leading `not`. */
function evalClause(clause: string, args: Record<string, unknown>): boolean | null {
  const negated = /^not\s+/i.test(clause);
  const body = negated ? clause.replace(/^not\s+/i, "").trim() : clause;
  const value = evalSimpleClause(body, args);
  if (!negated) return value;
  return value === null ? null : !value;
}

function readPath(path: string, args: Record<string, unknown>): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined,
      args,
    );
}

function evalSimpleClause(clause: string, args: Record<string, unknown>): boolean | null {
  const sw = clause.match(STARTSWITH_RE);
  if (sw) {
    const actual = readPath(sw[1], args);
    const prefix = resolveOperand(sw[2].trim(), args);
    if (actual === undefined || actual === null) return null;
    if (typeof actual !== "string" || typeof prefix !== "string") return null;
    return actual.startsWith(prefix);
  }

  const inList = clause.match(IN_RE);
  if (inList) {
    const actual = readPath(inList[1], args);
    if (actual === undefined || actual === null || typeof actual === "object") return null;
    const items = inList[2]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => String(parseLiteral(s)));
    return items.includes(String(actual));
  }

  const cmp = clause.match(COMPARE_RE);
  if (cmp) {
    const actual = readPath(cmp[1], args);
    return compare(actual, cmp[2], resolveOperand(cmp[3].trim(), args));
  }

  return null; // unparseable → indeterminate → fail closed
}

/**
 * A right-hand operand is a literal (quoted string, number, boolean) OR a
 * bare identifier that resolves from the args/scope (e.g. `project_root`). A
 * bare word with no binding falls back to its literal string value.
 */
function resolveOperand(raw: string, args: Record<string, unknown>): string | number | boolean {
  const isLiteral =
    /^-?\d+(\.\d+)?$/.test(raw) ||
    raw === "true" ||
    raw === "false" ||
    /^".*"$/.test(raw) ||
    /^'.*'$/.test(raw);
  if (!isLiteral && /^[\w.]+$/.test(raw)) {
    const bound = readPath(raw, args);
    if (typeof bound === "string" || typeof bound === "number" || typeof bound === "boolean") {
      return bound;
    }
  }
  return parseLiteral(raw);
}

function parseLiteral(raw: string): string | number | boolean {
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (raw === "true") return true;
  if (raw === "false") return false;
  const quoted = raw.match(/^"(.*)"$/) ?? raw.match(/^'(.*)'$/);
  if (quoted) return quoted[1];
  return raw;
}

/**
 * Three-valued comparison. Returns null (indeterminate) when the argument is
 * missing or can't be coerced for the operator, so the caller fails closed.
 */
function compare(
  actual: unknown,
  op: string,
  literal: string | number | boolean,
): boolean | null {
  if (actual === undefined || actual === null) return null; // missing arg

  if (typeof literal === "number") {
    const num = typeof actual === "number" ? actual : Number(actual);
    if (Number.isNaN(num)) return null; // uncoercible operand
    if (op === "==") return num === literal;
    if (op === "!=") return num !== literal;
    if (op === ">") return num > literal;
    if (op === ">=") return num >= literal;
    if (op === "<") return num < literal;
    if (op === "<=") return num <= literal;
    return null;
  }

  // string / boolean literal: equality is defined for scalars; ordering is not
  if (op === "==" || op === "!=") {
    if (typeof actual === "object") return null; // object vs scalar — indeterminate
    const str = String(actual);
    return op === "==" ? str === String(literal) : str !== String(literal);
  }
  return null; // ordering against a non-numeric literal is unsupported
}
