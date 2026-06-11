import type { PolicyDecision } from "@/lib/dashboard/types";

/**
 * Deterministic policy evaluation. No model opinions here — policies are
 * data, evaluation is pure, and the strictest applicable policy always wins
 * (deny > require_approval > allow). Tools without a policy default to allow;
 * risky tools get a require_approval policy auto-created at discovery.
 *
 * Conditions use three-valued logic: a clause is true, false, or
 * INDETERMINATE (null) when the referenced argument is missing or can't be
 * coerced for the operator. Indeterminate fails CLOSED — the guarded policy
 * is treated as applicable — so an agent cannot dodge a `amount > 100` gate
 * by omitting or reshaping `amount`.
 */

const RANK: Record<PolicyDecision, number> = { allow: 1, require_approval: 2, deny: 3 };

export interface PolicyLike {
  decision: PolicyDecision;
  condition?: string | null;
}

/**
 * Evaluate a tool's policies against the call arguments. A policy applies
 * unless its condition evaluates to a definitive `false`; an unparseable or
 * indeterminate condition still applies (fail closed).
 */
export function evaluatePolicy<T extends PolicyLike>(
  policies: T[],
  args: Record<string, unknown>,
): { decision: PolicyDecision; policy: T | null } {
  let winner: T | null = null;
  for (const policy of policies) {
    const applies = policy.condition
      ? evalCondition(policy.condition, args) !== false
      : true;
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

const CLAUSE_RE = /^([\w.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/;

/**
 * Syntactic check only: are all clauses well-formed? Used to validate a
 * policy at authoring time. Distinct from evalCondition, which against empty
 * args now returns null (indeterminate) for every real condition.
 */
export function isParseableCondition(condition: string): boolean {
  const clauses = condition.split(/\s+and\s+/i);
  return clauses.every((clause) => CLAUSE_RE.test(clause.trim()));
}

/**
 * Tiny condition language: `path op literal` clauses joined with `and`.
 * Ops: == != > >= < <=. Paths are dot paths into the call arguments.
 * Returns:
 *   true  — every clause is satisfied
 *   false — at least one clause is definitively unsatisfied
 *   null  — unparseable, or a clause is indeterminate (missing/uncoercible
 *           operand) with no definitively-false clause; callers fail closed.
 * Examples: `amount > 100`, `branch == "main"`, `repo == acme/api and force == true`
 */
export function evalCondition(
  condition: string,
  args: Record<string, unknown>,
): boolean | null {
  let indeterminate = false;
  for (const clause of condition.split(/\s+and\s+/i)) {
    const m = clause.trim().match(CLAUSE_RE);
    if (!m) return null;
    const [, path, op, rawLiteral] = m;
    const actual = path
      .split(".")
      .reduce<unknown>(
        (acc, key) =>
          acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined,
        args,
      );
    const result = compare(actual, op, parseLiteral(rawLiteral.trim()));
    if (result === false) return false; // a definitive false short-circuits the AND
    if (result === null) indeterminate = true; // remember, but keep scanning for a false
  }
  return indeterminate ? null : true;
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
