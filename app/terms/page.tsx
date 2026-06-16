import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — Polyshield",
  description: "The terms that govern your use of Polyshield.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="June 14, 2026">
      <LegalSection title="1. What Polyshield is">
        <p>
          Polyshield is a policy gateway for AI agents. It sits between your AI
          agents and the tools they call (MCP servers, local or remote),
          enforces the policies you configure, holds risky calls for your
          approval, stores credentials you provide in an encrypted vault, and
          records an audit trail of agent activity. These Terms of Service
          (&quot;Terms&quot;) govern your access to and use of the Polyshield web
          application, API gateway, and local runner software (together, the
          &quot;Service&quot;).
        </p>
        <p>
          By creating an account or using the Service you agree to these Terms.
          If you use the Service on behalf of an organization, you represent
          that you have authority to bind that organization, and
          &quot;you&quot; means that organization.
        </p>
      </LegalSection>

      <LegalSection title="2. Your account">
        <p>
          You must provide accurate information when creating an account and
          keep your sign-in credentials, agent keys, and runner tokens secret.
          You are responsible for all activity that occurs under your account,
          including actions taken by AI agents using keys you issued. Notify us
          promptly at hello@polyshield.ai if you suspect unauthorized access.
        </p>
      </LegalSection>

      <LegalSection title="3. Your tools, credentials, and data">
        <p>
          The Service connects to tools and MCP servers that you choose to
          register. You are responsible for having the right to connect them
          and for complying with their terms. Credentials you store in the
          vault are encrypted (AES-256-GCM) and used solely to execute the
          calls your policies and approvals permit; we do not have a feature
          that displays them back to anyone.
        </p>
        <p>
          You retain all rights to your data. You grant us the limited license
          needed to operate the Service: storing your configuration, executing
          tool calls you authorize, and retaining audit logs of agent activity
          for your account.
        </p>
      </LegalSection>

      <LegalSection title="4. The policy engine is a control, not a guarantee">
        <p>
          Polyshield enforces the policies you write, holds calls you choose to
          gate, and screens tool output with heuristic prompt-injection
          defenses. No security control is perfect. You remain responsible for
          the actions of your agents, for the policies you configure (including
          tools you leave un-gated), and for reviewing approvals before
          granting them. The Service is a layer of defense — not a substitute
          for your own judgment about what an agent should be allowed to do.
        </p>
      </LegalSection>

      <LegalSection title="5. The local runner">
        <p>
          The Polyshield runner is software you install and run on your own
          machine. It launches the local programs (stdio MCP servers) that you
          register and executes tool calls that pass your policies. You are
          responsible for the programs you configure it to launch and for the
          consequences of their execution on your systems.
        </p>
      </LegalSection>

      <LegalSection title="6. Acceptable use">
        <p>You agree not to use the Service to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>break the law or violate the rights of others;</li>
          <li>access systems, data, or tools you are not authorized to access;</li>
          <li>probe, scan, or test the vulnerability of the Service except via responsible disclosure to us;</li>
          <li>resell or white-label the Service without our written agreement;</li>
          <li>interfere with the integrity or performance of the Service or other customers&apos; use of it.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Plans and billing">
        <p>
          Free and paid plans are described in the app. Paid subscriptions are
          billed in advance on a recurring monthly basis through Stripe and
          auto-renew until you cancel. You can cancel anytime from the billing
          page or the Stripe customer portal; cancellation stops future
          renewals, and your access continues until the end of the current paid
          period.
        </p>
        <p>
          Fees are non-refundable except where required by law. Taxes are your
          responsibility. Plan features, limits, and pricing may change with
          notice. Downgrading to a lower plan may reduce your limits and disable
          paid features — for example AI features, offline mode, additional
          notification channels, and the advanced sandbox. We may suspend or
          downgrade accounts that exceed plan limits or have unpaid balances.
        </p>
      </LegalSection>

      <LegalSection title="8. AI features are assistive, not a guarantee">
        <p>
          Polyshield&apos;s optional AI features — risk summaries, policy
          drafts, and audit digests — are advisory only. You are responsible for
          reviewing their output and for the policies and approvals you
          ultimately set. Enforcement is deterministic policy plus human
          approval; AI does not make the allow/deny decision, and you should not
          rely on it as if it did.
        </p>
      </LegalSection>

      <LegalSection title="9. Third-party notification integrations">
        <p>
          If you connect a notification destination — Slack, Discord, Telegram,
          or a custom webhook — you are responsible for the credentials and
          webhooks you provide and for the security of those destinations,
          including who can access the channel that receives approval
          notifications.
        </p>
      </LegalSection>

      <LegalSection title="10. Disclaimers">
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available,&quot;
          without warranties of any kind, express or implied, including
          merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that the Service will be
          uninterrupted, error-free, or that it will catch every harmful agent
          action or prompt-injection attempt.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitation of liability">
        <p>
          To the maximum extent permitted by law, neither party will be liable
          for indirect, incidental, special, consequential, or punitive
          damages, or lost profits or data. Our total liability for any claim
          arising out of the Service is limited to the amounts you paid us in
          the twelve months before the claim (or USD $100 if you paid
          nothing). Nothing in these Terms limits liability that cannot be
          limited by law.
        </p>
      </LegalSection>

      <LegalSection title="12. Termination">
        <p>
          You can stop using the Service and delete your account at any time.
          We may suspend or terminate the Service for breach of these Terms,
          to comply with law, or to protect the Service or its users. On
          termination, your right to use the Service ends; sections that by
          their nature survive (including 10, 11, and 13) survive.
        </p>
      </LegalSection>

      <LegalSection title="13. General">
        <p>
          These Terms are the entire agreement between us regarding the
          Service. We may update them; if a change is material we will give
          reasonable notice (e.g., by email or in-app), and continued use after
          the effective date constitutes acceptance. If a provision is found
          unenforceable, the rest remain in effect. You may not assign these
          Terms without our consent; we may assign them in connection with a
          merger, acquisition, or sale of assets.
        </p>
        <p>Questions? hello@polyshield.ai</p>
      </LegalSection>
    </LegalPage>
  );
}
