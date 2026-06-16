import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — Polyshield",
  description: "What Polyshield collects, why, and how it is protected.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="June 14, 2026">
      <LegalSection title="1. Overview">
        <p>
          Polyshield is a policy gateway for AI agents. Operating it requires
          handling some sensitive material — tool credentials and a record of
          what your agents did — so this policy is written to be concrete about
          what we store, how it is protected, and what we never do with it.
        </p>
      </LegalSection>

      <LegalSection title="2. What we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Account data</strong> — your email address and, if you sign
            in with Google, the name and avatar your provider shares.
          </li>
          <li>
            <strong>Configuration</strong> — the MCP servers, tools, policies,
            agents, and runners you set up.
          </li>
          <li>
            <strong>Credentials you store in the vault</strong> — auth headers
            and environment variables for your connected servers. These are
            encrypted with AES-256-GCM before they reach the database; the
            dashboard only ever shows masked previews, and there is no feature
            that displays the plaintext back to anyone.
          </li>
          <li>
            <strong>Audit logs</strong> — for each agent tool call routed
            through the gateway: the tool name, arguments, the policy decision,
            who approved or denied it, and a size-capped copy of the result.
            This is the product: it exists so you can see exactly what your
            agents did. Dashboard changes (servers added, tools toggled,
            policies edited) are logged the same way.
          </li>
          <li>
            <strong>Runner metadata</strong> — hostname, software version, and
            last-seen time of local runners you pair. The runner only dials
            out; we have no access to your machine beyond what it reports.
          </li>
          <li>
            <strong>Secrets we never store in usable form</strong> — agent keys
            and runner pairing tokens are kept only as SHA-256 hashes; the raw
            value is shown to you once and cannot be recovered by us.
          </li>
          <li>
            <strong>Billing data</strong> — if you subscribe to a paid plan, we
            store your Stripe customer ID, plan, subscription status, and
            current period end. We do not store full card numbers; card data is
            handled directly by Stripe (see &quot;Payments&quot; below).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. What we use it for">
        <p>
          To operate the Service: authenticate you, enforce your policies,
          execute the calls you authorize, show you your audit history, and
          keep the Service secure and reliable. We do not sell your data, use
          your credentials for anything except executing the calls your
          policies permit, or train AI models on your tool traffic.
        </p>
      </LegalSection>

      <LegalSection title="4. Payments">
        <p>
          When you subscribe to a paid plan, billing is processed by Stripe,
          our payment subprocessor. Stripe receives the data needed to process
          your payment — your email, billing details, and card data — and
          handles card data directly. Polyshield never sees or stores your full
          card number; we keep only your Stripe customer ID, plan, subscription
          status, and current period end so we can apply the right plan to your
          account. Stripe processes this data under its own privacy terms.
        </p>
      </LegalSection>

      <LegalSection title="5. AI features">
        <p>
          Polyshield includes an optional AI copilot — approval risk review,
          plain-English-to-policy drafting, and audit digests. When you (on a
          paid plan) invoke one of these features, we send the limited data
          needed to generate the analysis to our AI provider, currently Groq:
          the relevant tool name(s), the call arguments, the agent&apos;s stated
          reason, and, for digests, audit metadata. This only happens when you
          ask for an AI feature; we do not send tool traffic to the provider in
          the background.
        </p>
        <p>
          The AI provider does not train on this data, and Polyshield does not
          use your tool traffic to train models. AI output is assistive and may
          be imperfect — it does not make the allow/deny decision and you remain
          responsible for the policies and approvals you set. If you turn on
          offline/privacy mode (see below), AI digests see metadata only, which
          reduces what they can include.
        </p>
      </LegalSection>

      <LegalSection title="6. Notifications to third parties">
        <p>
          If you connect Slack, Discord, Telegram, or a custom webhook, then
          when a call is held for approval we send approval metadata to that
          destination at your direction: the tool name, agent name, risk level,
          reason, and a link back to your dashboard. We do not send call
          arguments or results. You choose the destination and are responsible
          for who can see that channel or webhook.
        </p>
      </LegalSection>

      <LegalSection title="7. Offline / privacy mode">
        <p>
          By default, audit logs store tool-call arguments and a size-capped
          copy of results so your history is fully inspectable. With
          offline/privacy mode turned on, Polyshield strips the arguments and
          results before writing the log and keeps only the tool name, the
          policy decision, the byte sizes, and the timestamp. File contents,
          diffs, and query results are never written to our database in this
          mode. Live policy, approval, and shield enforcement is unaffected —
          calls are still checked in full as they happen; only what gets
          persisted to the audit log changes.
        </p>
      </LegalSection>

      <LegalSection title="8. Two-factor authentication">
        <p>
          If you enable TOTP-based two-factor authentication, the authenticator
          secret is managed by our authentication provider (Supabase) and used
          only to verify your sign-in.
        </p>
      </LegalSection>

      <LegalSection title="9. Where it lives">
        <p>
          Data is stored with our infrastructure providers: Supabase (Postgres
          database and authentication) and our application hosting provider.
          They process data on our behalf under their own security and privacy
          commitments. Credentials are encrypted at the application layer
          before storage, so the database never contains usable plaintext
          secrets.
        </p>
      </LegalSection>

      <LegalSection title="10. Subprocessors">
        <p>
          We rely on a small set of third parties to operate the Service. Each
          processes only the data it needs for its function:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Supabase</strong> — Postgres database and authentication
            (including 2FA secrets).
          </li>
          <li>
            <strong>Our application hosting provider</strong> — runs the web app
            and API gateway.
          </li>
          <li>
            <strong>Stripe</strong> — payment processing for paid plans.
          </li>
          <li>
            <strong>Groq</strong> — generates output for the optional AI
            features.
          </li>
          <li>
            <strong>Your connected notification destinations</strong> — Slack,
            Discord, Telegram, or custom webhooks you choose to add receive
            approval metadata at your direction.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="11. Retention and deletion">
        <p>
          Audit log retention depends on your plan: Free keeps 7 days, Builder
          30 days, Team 1 year, and Enterprise is configurable. Configuration is
          kept while your account is active so your history remains inspectable.
          Deleting a server deletes its tools and policies; deleting your
          account deletes your projects and the data scoped to them. Encrypted
          credentials are deleted with the server they belong to. Contact
          hello@polyshield.ai for deletion requests or data export.
        </p>
      </LegalSection>

      <LegalSection title="12. Cookies">
        <p>
          We use only the cookies required to keep you signed in (Supabase
          auth session). No advertising or cross-site tracking cookies.
        </p>
      </LegalSection>

      <LegalSection title="13. Your rights">
        <p>
          Depending on where you live, you may have rights to access, correct,
          export, or delete your personal data, or to object to certain
          processing. Email hello@polyshield.ai and we will honor verified
          requests within a reasonable time.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes">
        <p>
          If we change this policy materially, we will notify you by email or
          in-app before the change takes effect. The &quot;Last updated&quot;
          date at the top always reflects the current version.
        </p>
        <p>Questions? hello@polyshield.ai</p>
      </LegalSection>
    </LegalPage>
  );
}
