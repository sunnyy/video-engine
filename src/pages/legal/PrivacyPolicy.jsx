import LegalLayout from "./LegalLayout";
import Section, { P, UL, Highlight, ContactBlock } from "./Section";

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="June 26, 2026">

      <Section title="1. Introduction">
        <P>PX Galaxy Studio ("we", "us", "our") operates Vidquence and is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, and your rights regarding that data.</P>
        <P>We comply with India's Digital Personal Data Protection Act, 2023 (DPDPA). Where applicable, we also follow internationally recognised privacy principles for users located outside India.</P>
        <P>By using the Service, you consent to the practices described in this policy. If you do not agree, please discontinue use of the Service.</P>
      </Section>

      <Section title="2. Data We Collect">
        <P><strong style={{ color: "#fff" }}>Account data:</strong> When you register, we collect your email address and encrypted password. You may optionally provide a display name.</P>
        <P><strong style={{ color: "#fff" }}>Usage data:</strong> We collect information about how you use the Service, including features accessed, videos generated, credits consumed, session timestamps, and browser/device type.</P>
        <P><strong style={{ color: "#fff" }}>Content metadata:</strong> We store metadata about your generated projects — topic, niche, beat structure, layout selections, and generation parameters. We do not permanently store the full text of AI-generated scripts beyond what is needed for your project.</P>
        <P><strong style={{ color: "#fff" }}>Payment data:</strong> Payment transactions are processed by Razorpay. We store only transaction reference IDs and credit amounts — we never store full card numbers, CVVs, UPI credentials, or banking details.</P>
        <P><strong style={{ color: "#fff" }}>Uploaded assets:</strong> Files you upload (images, videos, audio) are stored in our cloud storage for use within your projects.</P>
      </Section>

      <Section title="3. How We Use Your Data">
        <UL items={[
          "Account creation, authentication, and management",
          "Providing and improving the Service and its AI features",
          "Processing credit transactions and maintaining your credit balance",
          "Sending transactional emails (account confirmation, billing notifications, account alerts)",
          "Sending product announcements and promotional emails (you may opt out at any time)",
          "Debugging, error monitoring, and performance improvement",
          "Detecting and preventing abuse, fraud, or policy violations",
          "Aggregated analytics to understand feature usage (never sold to third parties)",
        ]} />
        <P>We do not sell your personal data to third parties. We do not use your data for advertising profiling.</P>
      </Section>

      <Section title="4. Third-Party Services">
        <P>The Service integrates with third-party providers to deliver its features. These providers process data only as necessary to perform the specific function described:</P>
        <UL items={[
          "Database, authentication, and file storage — your account data, project files, and uploaded assets are stored on a cloud database and storage provider hosted in secure data centres",
          "AI language model and content moderation providers — your text prompts and content inputs are processed by AI providers for script generation, voice synthesis, image prompt creation, and content safety screening",
          "AI image and video generation providers — prompts and reference images you submit are processed to produce generated images and video clips",
          "Payment processing — Razorpay processes all payment transactions; we never receive or store your card, UPI, or banking credentials (razorpay.com/privacy)",
        ]} />
        <Highlight>When you use AI features, your prompts and content inputs are transmitted to third-party AI processing providers. Each provider has its own data retention and usage policies. We only engage providers who maintain industry-standard data protection practices, but we recommend reviewing the relevant provider's privacy policy if you have specific concerns about how your inputs are handled.</Highlight>
      </Section>

      <Section title="5. Connecting Social Accounts (Google / YouTube API Services)">
        <P>Vidquence lets you connect your YouTube channel so the Service can publish videos you create directly to your channel on your behalf. To provide this, Vidquence uses <strong style={{ color: "#fff" }}>YouTube API Services</strong>. By connecting your account and using these features, you agree to the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer" style={{ color: "#f5c518" }}>YouTube Terms of Service</a>, and your use of Google data is also governed by the <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" style={{ color: "#f5c518" }}>Google Privacy Policy</a>.</P>
        <P><strong style={{ color: "#fff" }}>Google data we access.</strong> When you connect a YouTube account, we request only the minimum scopes needed to publish on your behalf:</P>
        <UL items={[
          "youtube.readonly — to read your basic channel details (channel name, ID, and thumbnail) so we can show you which channel you are publishing to",
          "youtube.upload — to upload and publish the videos you explicitly choose to publish to your channel",
        ]} />
        <P>We do not access your watch history, private videos you did not create through Vidquence, comments, subscriber lists, analytics, or any other Google or YouTube data beyond the scopes listed above.</P>
        <Highlight>Vidquence's use and transfer of information received from Google APIs to any other app will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "underline" }}>Google API Services User Data Policy</a>, including the Limited Use requirements.</Highlight>
        <P><strong style={{ color: "#fff" }}>Storage and use.</strong> We store the OAuth access and refresh tokens Google issues to us in encrypted form, solely to maintain your connection and publish videos at your request. We never sell this data, never share it with third parties, and never use it for advertising or any purpose other than the publishing features you ask for.</P>
        <P><strong style={{ color: "#fff" }}>Revoking access.</strong> You can disconnect your YouTube account at any time from within Vidquence, which deletes the stored tokens. You may also revoke Vidquence's access directly from your Google Account at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" style={{ color: "#f5c518" }}>myaccount.google.com/permissions</a>. When you disconnect an account or delete your Vidquence account, we delete the associated Google/YouTube tokens within 30 days.</P>
      </Section>

      <Section title="6. Data Storage and Security">
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

      <Section title="7. Your Rights">
        <P>Under India's Digital Personal Data Protection Act, 2023 (DPDPA) and applicable international privacy regulations, you have the following rights regarding your personal data:</P>
        <UL items={[
          "Access — request a copy of the personal data we hold about you",
          "Correction — request correction of inaccurate personal data",
          "Deletion (Right to Erasure) — request deletion of your account and associated data",
          "Nomination — nominate another individual to exercise your rights in the event of death or incapacity (as required under DPDPA)",
          "Export — request an export of your project data in a portable format",
          "Withdraw consent — withdraw consent for data processing at any time (this may prevent you from using the Service)",
          "Grievance — raise a grievance regarding how your data is handled",
        ]} />
        <P>To exercise any of these rights, contact us at the email below. We will respond within 30 days. Note that deleting your account will permanently remove all your projects, uploads, and credit balance with no possibility of recovery.</P>
      </Section>

      <Section title="8. Data Retention">
        <P>We retain your account data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or financial record-keeping obligations (typically up to 7 years for transaction records under Indian tax law).</P>
        <P>Uploaded assets (images, audio, video) stored in your personal cloud storage folder are retained for as long as your account is active and deleted within 30 days of account deletion.</P>
      </Section>

      <Section title="9. Cookies">
        <P>We use only essential cookies and browser local storage required for authentication and maintaining your logged-in state. We do not use:</P>
        <UL items={[
          "Advertising or tracking cookies",
          "Third-party analytics cookies (e.g. Google Analytics)",
          "Cross-site tracking of any kind",
        ]} />
        <P>This essential storage is cleared when you log out or clear your browser's site data. You can disable it in your browser settings, but this will prevent you from using the Service. For full details, see our <a href="/cookies" style={{ color: "#f5c518" }}>Cookie Policy</a>.</P>
      </Section>

      <Section title="10. Children's Privacy">
        <P>The Service is not intended for users under 18 years of age. We do not knowingly collect personal data from minors. If you believe a minor has created an account, please contact us and we will delete the account promptly.</P>
      </Section>

      <Section title="11. Changes to This Policy">
        <P>We may update this Privacy Policy from time to time. We will notify registered users of material changes via email. Continued use of the Service after changes constitutes acceptance of the updated policy.</P>
      </Section>

      <Section title="12. Contact for Privacy Requests">
        <P>For privacy-related requests, questions, or concerns:</P>
        <ContactBlock email="hello@vidquence.com" />
      </Section>

    </LegalLayout>
  );
}
