import LegalLayout from "./LegalLayout";
import Section, { P, UL, Highlight, ContactBlock } from "./Section";

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="January 1, 2025">

      <Section title="1. Introduction">
        <P>PX Galaxy Studio ("we", "us", "our") operates Vidquence and is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, and your rights regarding that data.</P>
        <P>By using the Service, you consent to the practices described in this policy. If you do not agree, please discontinue use of the Service.</P>
      </Section>

      <Section title="2. Data We Collect">
        <P><strong style={{ color: "#fff" }}>Account data:</strong> When you register, we collect your email address and encrypted password. You may optionally provide a display name.</P>
        <P><strong style={{ color: "#fff" }}>Usage data:</strong> We collect information about how you use the Service, including features accessed, videos generated, credits consumed, session timestamps, and browser/device type.</P>
        <P><strong style={{ color: "#fff" }}>Content metadata:</strong> We store metadata about your generated projects — topic, niche, beat structure, layout selections, and generation parameters. We do not permanently store the full text of AI-generated scripts beyond what is needed for your project.</P>
        <P><strong style={{ color: "#fff" }}>Payment data:</strong> Payment transactions are processed by third-party payment providers (Stripe or Razorpay). We store only transaction reference IDs and credit amounts — we never store full card numbers, CVVs, or banking details.</P>
        <P><strong style={{ color: "#fff" }}>Uploaded assets:</strong> Files you upload (images, videos, audio) are stored in our cloud storage for use within your projects.</P>
      </Section>

      <Section title="3. How We Use Your Data">
        <UL items={[
          "Account creation, authentication, and management",
          "Providing and improving the Service and its AI features",
          "Processing credit transactions and maintaining your credit balance",
          "Sending transactional emails (account confirmation, billing notifications)",
          "Debugging, error monitoring, and performance improvement",
          "Detecting and preventing abuse, fraud, or policy violations",
          "Aggregated analytics to understand feature usage (never sold to third parties)",
        ]} />
        <P>We do not sell your personal data to third parties. We do not use your data for advertising profiling.</P>
      </Section>

      <Section title="4. Third-Party Services">
        <P>The Service integrates with the following third-party providers. Each has its own privacy policy governing their data handling:</P>
        <UL items={[
          "Supabase — database, authentication, and file storage (supabase.com/privacy)",
          "Anthropic — AI language model for script and content generation (anthropic.com/privacy)",
          "Fal.ai — AI image generation (fal.ai/privacy)",
          "ElevenLabs — text-to-speech voice synthesis (elevenlabs.io/privacy)",
          "Stripe / Razorpay — payment processing (stripe.com/privacy, razorpay.com/privacy)",
        ]} />
        <Highlight>When you use AI features, your prompts and content inputs are processed by these third-party AI providers subject to their respective policies.</Highlight>
      </Section>

      <Section title="5. Data Storage and Security">
        <P>Your data is stored on Supabase infrastructure hosted primarily in the United States and European Union. By using the Service, you consent to the transfer and storage of your data in these locations.</P>
        <P>We implement industry-standard security measures including:</P>
        <UL items={[
          "Encrypted data transmission (HTTPS/TLS)",
          "Encrypted password storage (bcrypt hashing via Supabase Auth)",
          "Row-Level Security (RLS) policies on all database tables",
          "Access controls limiting data access to authorized systems only",
        ]} />
        <P>No system is 100% secure. While we work to protect your data, we cannot guarantee absolute security against all threats.</P>
      </Section>

      <Section title="6. Your Rights">
        <P>You have the following rights regarding your personal data:</P>
        <UL items={[
          "Access — request a copy of the personal data we hold about you",
          "Correction — request correction of inaccurate personal data",
          "Deletion — request deletion of your account and associated data",
          "Export — request an export of your project data in a portable format",
          "Objection — object to processing of your data in certain circumstances",
        ]} />
        <P>To exercise any of these rights, contact us at the email below. We will respond within 30 days. Note that deleting your account will permanently remove all your projects, uploads, and credit balance with no possibility of recovery.</P>
      </Section>

      <Section title="7. Data Retention">
        <P>We retain your account data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or financial record-keeping obligations (typically up to 7 years for transaction records under Indian tax law).</P>
        <P>AI-generated image assets stored in our shared library may be retained for service improvement purposes in an anonymized form.</P>
      </Section>

      <Section title="8. Cookies">
        <P>We use only essential session cookies required for authentication and maintaining your logged-in state. We do not use:</P>
        <UL items={[
          "Advertising or tracking cookies",
          "Third-party analytics cookies (e.g. Google Analytics)",
          "Cross-site tracking of any kind",
        ]} />
        <P>Session cookies are automatically deleted when you close your browser or log out. You can disable cookies in your browser settings, but this will prevent you from using the Service.</P>
      </Section>

      <Section title="9. Children's Privacy">
        <P>The Service is not intended for users under 18 years of age. We do not knowingly collect personal data from minors. If you believe a minor has created an account, please contact us and we will delete the account promptly.</P>
      </Section>

      <Section title="10. Changes to This Policy">
        <P>We may update this Privacy Policy from time to time. We will notify registered users of material changes via email. Continued use of the Service after changes constitutes acceptance of the updated policy.</P>
      </Section>

      <Section title="11. Contact for Privacy Requests">
        <P>For privacy-related requests, questions, or concerns:</P>
        <ContactBlock email="hello@vidquence.com" />
      </Section>

    </LegalLayout>
  );
}
