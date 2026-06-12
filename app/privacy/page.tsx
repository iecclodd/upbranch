import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — Polyshield",
  description: "What Polyshield collects, why, and how it is protected.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="June 11, 2026">
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

      <LegalSection title="4. Where it lives">
        <p>
          Data is stored with our infrastructure providers: Supabase (Postgres
          database and authentication) and our application hosting provider.
          They process data on our behalf under their own security and privacy
          commitments. Credentials are encrypted at the application layer
          before storage, so the database never contains usable plaintext
          secrets.
        </p>
      </LegalSection>

      <LegalSection title="5. Retention and deletion">
        <p>
          Configuration and audit logs are kept while your account is active so
          your history remains inspectable. Deleting a server deletes its tools
          and policies; deleting your account deletes your projects and the
          data scoped to them. Encrypted credentials are deleted with the
          server they belong to. Contact hello@polyshield.ai for deletion
          requests or data export.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies">
        <p>
          We use only the cookies required to keep you signed in (Supabase
          auth session). No advertising or cross-site tracking cookies.
        </p>
      </LegalSection>

      <LegalSection title="7. Your rights">
        <p>
          Depending on where you live, you may have rights to access, correct,
          export, or delete your personal data, or to object to certain
          processing. Email hello@polyshield.ai and we will honor verified
          requests within a reasonable time.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes">
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
