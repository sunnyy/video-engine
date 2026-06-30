import LegalLayout from "./LegalLayout";
import Section, { P, UL, Highlight, ContactBlock } from "./Section";

export default function CookiePolicy() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated="June 30, 2026">

      <Section title="1. Overview">
        <P>This Cookie Policy explains how Vidquence (operated by PX Galaxy Studio) uses cookies and similar browser storage technologies. It supplements our <a href="/privacy" style={{ color: "#f5c518" }}>Privacy Policy</a>.</P>
        <Highlight>Vidquence uses only strictly necessary storage required to sign you in and keep you logged in. We do not use advertising, analytics, or cross-site tracking cookies — so there is nothing for you to opt into or out of.</Highlight>
      </Section>

      <Section title="2. What Are Cookies and Local Storage?">
        <P>Cookies are small text files a website stores on your device. "Local storage" is a similar browser technology that lets a web application keep small amounts of data (such as a login session) on your device. Both are used to make a site work and to remember you between page loads.</P>
        <P>Where this policy refers to "cookies," it also covers equivalent browser storage technologies such as local storage and session storage.</P>
      </Section>

      <Section title="3. What We Use">
        <P><strong style={{ color: "#fff" }}>Essential authentication storage.</strong> When you sign in, our authentication provider (Supabase Auth) stores your session token in your browser's local storage. This is what keeps you logged in as you move between pages. Without it, you cannot use the Service.</P>
        <P><strong style={{ color: "#fff" }}>Essential preferences.</strong> We may store small functional values in your browser (for example, interface preferences) so the app behaves consistently for you. These are not used to track you.</P>
      </Section>

      <Section title="4. What We Do NOT Use">
        <UL items={[
          "Advertising or marketing cookies",
          "Third-party analytics cookies (e.g. Google Analytics)",
          "Cross-site or cross-device tracking of any kind",
          "Profiling or behavioural ad-targeting technologies",
        ]} />
        <P>Because we use only strictly necessary storage, no cookie-consent banner is required under EU ePrivacy rules or comparable regulations. We disclose this use here and in our Privacy Policy for transparency.</P>
      </Section>

      <Section title="5. Third-Party Storage">
        <P>Some third-party services we rely on (for example, our payment processor Razorpay during checkout, or Google during YouTube account connection) may set their own cookies when you interact with them. These are governed by those providers' own cookie and privacy policies. We do not control them and do not use them to track you across the web.</P>
      </Section>

      <Section title="6. Managing Cookies and Storage">
        <P>You can clear or block cookies and local storage at any time through your browser settings, and you can delete site data for Vidquence specifically. Because the storage we use is essential, disabling it will log you out and prevent you from using the Service.</P>
        <P>Most browsers also offer a "clear site data" option that removes your stored session — this is equivalent to logging out.</P>
      </Section>

      <Section title="7. Changes to This Policy">
        <P>If we ever introduce non-essential cookies (such as analytics), we will update this policy and, where required, present a consent mechanism before any such cookies are set.</P>
      </Section>

      <Section title="8. Contact">
        <P>Questions about this Cookie Policy?</P>
        <ContactBlock email="hello@vidquence.com" />
      </Section>

    </LegalLayout>
  );
}
