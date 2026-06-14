// Unit test for the policy engine — the deterministic core. Imports the real
// module (node strips the type-only @/ import). Run: node scripts/policy-test.mjs
import { evaluatePolicy, evalCondition, isParseableCondition } from "../lib/gateway/policy.ts";

let passed = 0;
let failed = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++;
  else {
    failed++;
    console.log(`FAIL ${name}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}

const deny = (condition) => [{ decision: "deny", condition }];
const gate = (condition) => [{ decision: "require_approval", condition }];

// --- the critical fix: conditional gate must NOT be bypassable by omitting/reshaping the arg ---
check("gate amount>100, amount=200 → require_approval",
  evaluatePolicy(gate("amount > 100"), { amount: 200 }).decision, "require_approval");
check("gate amount>100, amount=50 → allow (condition genuinely false)",
  evaluatePolicy(gate("amount > 100"), { amount: 50 }).decision, "allow");
check("gate amount>100, amount MISSING → require_approval (fail closed)",
  evaluatePolicy(gate("amount > 100"), {}).decision, "require_approval");
check("gate amount>100, amount='abc' (uncoercible) → require_approval (fail closed)",
  evaluatePolicy(gate("amount > 100"), { amount: "abc" }).decision, "require_approval");
check("gate amount>100, amount=null → require_approval (fail closed)",
  evaluatePolicy(gate("amount > 100"), { amount: null }).decision, "require_approval");
check("deny amount>100, amount as object → deny (fail closed)",
  evaluatePolicy(deny("amount > 100"), { amount: {} }).decision, "deny");

// --- ordering against a non-numeric literal is indeterminate → fail closed (applies) ---
check("deny tier>\"gold\" (string ordering) → deny (fail closed, was silently skipped before)",
  evaluatePolicy(deny('tier > "gold"'), { tier: "silver" }).decision, "deny");

// --- equality semantics still work for the well-defined cases ---
check("gate branch=='main', branch=main → require_approval",
  evaluatePolicy(gate('branch == "main"'), { branch: "main" }).decision, "require_approval");
check("gate branch=='main', branch=dev → allow (genuinely not equal)",
  evaluatePolicy(gate('branch == "main"'), { branch: "dev" }).decision, "allow");
check("gate branch=='main', branch MISSING → allow (undefined is indeterminate→applies? check)",
  evaluatePolicy(gate('branch == "main"'), {}).decision, "require_approval");

// --- multi-clause AND ---
check("amount>100 and force==true, both true → gate",
  evaluatePolicy(gate("amount > 100 and force == true"), { amount: 200, force: true }).decision, "require_approval");
check("amount>100 and force==true, force false → allow",
  evaluatePolicy(gate("amount > 100 and force == true"), { amount: 200, force: false }).decision, "allow");
check("amount>100 and force==true, amount missing → gate (fail closed)",
  evaluatePolicy(gate("amount > 100 and force == true"), { force: true }).decision, "require_approval");

// --- strictest wins (now incl. flag between allow and require_approval) ---
check("deny beats require_approval",
  evaluatePolicy([{ decision: "require_approval" }, { decision: "deny" }], {}).decision, "deny");
check("require_approval beats allow",
  evaluatePolicy([{ decision: "allow" }, { decision: "require_approval" }], {}).decision, "require_approval");
check("require_approval beats flag",
  evaluatePolicy([{ decision: "flag" }, { decision: "require_approval" }], {}).decision, "require_approval");
check("flag beats allow",
  evaluatePolicy([{ decision: "allow" }, { decision: "flag" }], {}).decision, "flag");
check("no policies → allow",
  evaluatePolicy([], {}).decision, "allow");

// --- path scoping (startsWith) + not + project_root scope injection ---
const denyOutsideRoot = [{ decision: "deny", condition: "not path startsWith project_root" }];
check("write inside project_root → allow (deny policy doesn't apply)",
  evaluatePolicy(denyOutsideRoot, { path: "/repo/src/a.ts" }, { project_root: "/repo" }).decision, "allow");
check("write outside project_root → deny",
  evaluatePolicy(denyOutsideRoot, { path: "/etc/passwd" }, { project_root: "/repo" }).decision, "deny");
check("write with path missing → deny (fail closed)",
  evaluatePolicy(denyOutsideRoot, {}, { project_root: "/repo" }).decision, "deny");
check("startsWith true",
  evalCondition('path startsWith "/repo"', { path: "/repo/x" }), true);
check("startsWith false",
  evalCondition('path startsWith "/repo"', { path: "/etc/x" }), false);
check("startsWith missing → null",
  evalCondition('path startsWith "/repo"', {}), null);

// --- in [list] (git action gating, action injected from scope) ---
const gateGitWrites = [{ decision: "require_approval", condition: 'action in ["push", "tag", "release"]' }];
check("git push → require_approval",
  evaluatePolicy(gateGitWrites, {}, { action: "push" }).decision, "require_approval");
check("git status → allow",
  evaluatePolicy(gateGitWrites, {}, { action: "status" }).decision, "allow");
check("in true", evalCondition('x in ["a", "b"]', { x: "b" }), true);
check("in false", evalCondition('x in ["a", "b"]', { x: "c" }), false);

// --- new forms are parseable ---
check("isParseable startsWith", isParseableCondition("path startsWith project_root"), true);
check("isParseable not startsWith", isParseableCondition("not path startsWith project_root"), true);
check("isParseable in", isParseableCondition('action in ["push", "tag"]'), true);

// --- no policies → allow ---
check("no policies → allow (2)",
  evaluatePolicy([], {}).decision, "allow");

// --- raw evalCondition three-valued ---
check("evalCondition missing arg → null", evalCondition("amount > 100", {}), null);
check("evalCondition true", evalCondition("amount > 100", { amount: 200 }), true);
check("evalCondition false", evalCondition("amount > 100", { amount: 5 }), false);
check("evalCondition unparseable → null", evalCondition("garbage", {}), null);

// --- validator: syntax only, independent of args ---
check("isParseableCondition valid", isParseableCondition("amount > 100"), true);
check("isParseableCondition valid quoted", isParseableCondition('branch == "main"'), true);
check("isParseableCondition valid AND", isParseableCondition("a > 1 and b == 2"), true);
check("isParseableCondition garbage", isParseableCondition("not a condition!!"), false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
