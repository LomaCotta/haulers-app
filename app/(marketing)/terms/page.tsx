export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900">Terms of Service & Privacy Policy</h1>
          <p className="text-gray-600 mt-2">Last updated: November 6, 2025</p>
        </header>

        {/* Terms */}
        <section id="terms" className="space-y-6 mb-12">
          <h2 className="text-2xl font-bold text-gray-900">Terms of Service</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">1) What we are</h3>
              <p className="text-gray-700">Haulers.app is a community platform offering free tools for local services (starting with movers) and optional paid white-label/embedding services. We do not sell leads. We verify activity to reduce fraud, but you are responsible for your own business decisions.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">2) Accepting these Terms</h3>
              <p className="text-gray-700">By accessing the Platform (web, API, embeds, emails, Discord links), you agree to these Terms and our Privacy Policy. If you don’t agree, don’t use the Platform.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">3) Who may use Haulers</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>You must be 18+ (or the age of majority where you live).</li>
                <li>If you create or claim a provider profile, you represent you’re authorized to act for that business.</li>
                <li>We may refuse, suspend, or terminate access for any reason to protect users and the Platform.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">4) Key principles</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>No platform fees for consumers and free core tools for providers on Haulers.app.</li>
                <li>Donations are voluntary and currently not tax-deductible unless we announce formal charitable status.</li>
                <li>White-label/Embedding and certain enterprise integrations are paid services with separate terms or an SOW.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">5) Acceptable Use (AUP)</h3>
              <p className="text-gray-700">You agree not to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Break laws; impersonate others; submit false, defamatory, abusive, or infringing content.</li>
                <li>Post fake reviews, manipulate ratings, or use bots/click-farms.</li>
                <li>Scrape, spider, or bulk-harvest data (except as allowed by our robots.txt or written permission).</li>
                <li>Probe/attack security; upload malware; overload our infra; circumvent rate limits.</li>
                <li>Misuse our marks or imply endorsement without written permission.</li>
                <li><strong>No Hacking:</strong> You may not attempt to bypass security, manipulate pricing, or interfere with our operations.</li>
                <li><strong>No Scraping/Harvesting:</strong> Collection of customer data, pricing information, or service details without authorization is strictly forbidden.</li>
                <li><strong>Damages:</strong> ANY UNAUTHORIZED ACCESS OR BREACH WILL RESULT IN LIQUIDATED DAMAGES OF NOT LESS THAN $10,000 PER INCIDENT OR $5,000 PER DAY OF CONTINUED BREACH, IN ADDITION TO ACTUAL DAMAGES AND LEGAL FEES.</li>
              </ul>
              <p className="text-gray-700 mt-2">You agree to reimburse us for all costs of investigation, remediation, and enforcement.</p>
              <p className="text-gray-700">We can remove content and/or suspend accounts at our discretion.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">6) Content & Licenses</h3>
              <p className="text-gray-700">Your Content (text, photos, logos, reviews you post): you own it. You grant Haulers a worldwide, non-exclusive, royalty-free license to host, store, display, distribute, and adapt it to operate the Platform (including anti-fraud systems, search, thumbnails, backups, and training internal quality models that improve abuse/fraud detection).</p>
              <p className="text-gray-700">User/Third-Party Content may be inaccurate or outdated. Use at your own risk.</p>
              <p className="text-gray-700">IP complaints/DMCA: Send notices to: dmca@haulers.app (include URLs, signature, good-faith statement). We may remove content and, where appropriate, terminate repeat infringers.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">7) Provider Accounts (business pages)</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>You’re responsible for the accuracy of your profile, credentials, licenses, pricing, and compliance with laws.</li>
                <li>No incentives for reviews; no gating or suppression.</li>
                <li>By claiming your page, you authorize us to display public business info and to contact you about safety, verification, or feature updates.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">8) Bookings, payments, and donations</h3>
              <p className="text-gray-700">Core tools on Haulers.app are free. If payment processing is used, processor fees apply and are disclosed at checkout. Donations are voluntary and used per our transparency ledger; generally non-refundable except for processing error or fraud. Not tax-deductible unless we later obtain eligible status. White-label/Embeds: separate order form/SOW governs scope, uptime, support, and fees. If not, these Terms apply by default.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">9) Transparency & ledgers</h3>
              <p className="text-gray-700">We publish monthly ledgers showing revenue (donations, service fees) and expenses (infra, moderation, grants). We may revise past entries to correct mistakes.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">10) Security; no guarantee against attacks</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>We take reasonable measures, but no system is perfectly secure.</li>
                <li>Incidents can still happen; safeguard your credentials; we may suspend features to protect the Platform.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">11) Warranty disclaimer</h3>
              <p className="text-gray-700">THE PLATFORM IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AVAILABILITY, ACCURACY, AND SECURITY. WE DO NOT GUARANTEE ANY SPECIFIC LEADS, BOOKINGS, RANKINGS, REVIEW OUTCOMES, OR EARNINGS.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">12) Limitation of liability</h3>
              <p className="text-gray-700">TO THE MAXIMUM EXTENT PERMITTED BY LAW, HAULERS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES; LOSS OF PROFITS/REVENUE; LOSS OF DATA; SECURITY INCIDENTS CAUSED BY THIRD PARTIES; OR BUSINESS INTERRUPTION. OUR TOTAL LIABILITY FOR ANY CLAIM IN ANY 12-MONTH PERIOD IS LIMITED TO THE GREATER OF USD $100 OR THE AMOUNT YOU PAID US FOR SERVICES IN THAT PERIOD (EXCLUDING DONATIONS).</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">13) Indemnification</h3>
              <p className="text-gray-700">You agree to defend, indemnify, and hold harmless Haulers from claims, damages, losses, costs, and expenses (including reasonable attorneys’ fees) arising out of (a) your content or conduct, (b) your services to customers, (c) your breach of these Terms, or (d) your violation of law or third-party rights.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">14) Dispute resolution; arbitration; class-action waiver</h3>
              <p className="text-gray-700">Governing law: State of California. Binding arbitration (JAMS/AAA). Venue: Los Angeles County, CA (or remote). No class actions; individual actions only. Small claims allowed; injunctive relief available to protect IP/security. 1-year limit on claims.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">15) Changes</h3>
              <p className="text-gray-700">We may update these Terms. If changes are material, we’ll post a notice. Continued use means you accept the changes.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">16) Termination</h3>
              <p className="text-gray-700">You may stop using the Platform at any time. We may suspend or terminate access to protect users or for violations. Sections 6–14 survive termination.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">17) Miscellaneous</h3>
              <p className="text-gray-700">No waiver unless in writing. If a provision is unenforceable, the rest remains in effect. You may not assign these Terms without consent; we may assign to an affiliate or successor.</p>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Privacy Policy — Haulers.app</h2>
          <p className="text-gray-600">Last updated: November 6, 2025</p>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">1) What this covers</h3>
              <p className="text-gray-700">How we collect, use, share, and protect personal information on Haulers.app, our APIs, and related services. If a separate SOW or DPA applies (e.g., for white-label), it controls for that relationship.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">2) Data we collect</h3>
              <p className="text-gray-700">You give us: account details, business info, listings, availability, invoices, reviews, messages, donations. Automated: device/browser, IP, cookies, analytics, crash logs, fraud signals. From others: public business data, reports, and payment processors (limited tokens/receipts).</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">3) Why we use data</h3>
              <p className="text-gray-700">Operate the platform; protect users; improve features; communicate; process donations/paid services; legal compliance.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">4) Legal bases (EEA/UK)</h3>
              <p className="text-gray-700">Consent, contract necessity, legitimate interests (e.g., platform security), and compliance with legal obligations.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">5) Sharing</h3>
              <p className="text-gray-700">Processors (hosting, email, analytics, anti-fraud, payments); operational transparency (financial ledgers, not personal data); legal/safety; and business changes.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">6) Cookies & tracking</h3>
              <p className="text-gray-700">We use necessary cookies and limited analytics. Blocking cookies may break parts of the site.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">7) Data retention</h3>
              <p className="text-gray-700">We keep data while your account is active and as needed for operations, security, and legal obligations, with data minimization where possible.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">8) Your choices & rights</h3>
              <p className="text-gray-700">Access, correct, delete your data; export upon request; opt out of non-essential emails. EEA/UK residents have additional GDPR rights.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">9) Security</h3>
              <p className="text-gray-700">We use reasonable safeguards (encryption in transit, access controls, logging) but no method is 100% secure. We’ll notify as required in case of a breach that risks harm.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">10) Children</h3>
              <p className="text-gray-700">Not for under‑13 (or under the age required by local law). We don’t knowingly collect children’s data.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">11) International transfers</h3>
              <p className="text-gray-700">Your data may be processed in the U.S. and other countries with different laws. We use appropriate safeguards for transfers where required.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">12) Donations & payments</h3>
              <p className="text-gray-700">Payments are processed by third parties (e.g., Stripe). We do not store full card numbers. Donation acknowledgments are receipts, not tax-deductible confirmations unless explicitly stated.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">13) White-label / embeds / API</h3>
              <p className="text-gray-700">If you embed our tools or use our API, you must provide legally compliant privacy disclosures to your users. We act as a processor/service provider for end-user data; a separate DPA can apply on request.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">14) Changes</h3>
              <p className="text-gray-700">We’ll update this Policy as needed. Continued use means you accept the updated Policy.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
