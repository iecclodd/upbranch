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

// --- strictest wins ---
check("deny beats require_approval",
  evaluatePolicy([{ decision: "require_approval" }, { decision: "deny" }], {}).decision, "deny");
check("require_approval beats allow",
  evaluatePolicy([{ decision: "allow" }, { decision: "require_approval" }], {}).decision, "require_approval");
check("no policies → allow",
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
