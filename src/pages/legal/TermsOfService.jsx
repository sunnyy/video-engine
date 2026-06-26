import LegalLayout from "./LegalLayout";
import Section, { P, UL, Highlight, ContactBlock } from "./Section";

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="June 26, 2026">

      <Section title="1. Acceptance of Terms">
        <P>By accessing or using Vidquence ("the Service"), operated by PX Galaxy Studio, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.</P>
        <P>These Terms apply to all users, visitors, and others who access or use the Service. We reserve the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</P>
      </Section>

      <Section title="2. Description of Service">
        <P>Vidquence is an AI-powered video production platform that enables users to generate, edit, and export short-form videos using artificial intelligence. The Service operates on a credit-based system where different actions consume varying amounts of credits.</P>
        <P>Core features include AI script generation, beat-based video structuring, AI image generation, text-to-speech voice synthesis, layout management, editing, and video export. The Service also lets you upload your own media (such as video clips, images, and audio) for use in your projects, automate recurring video creation, and — where you connect a third-party account — publish finished videos directly to that account on your behalf. Feature availability depends on the user's active plan and credit balance.</P>
      </Section>

      <Section title="3. User Accounts and Registration">
        <P>To use the Service, you must create an account by providing a valid email address and creating a password. You are responsible for:</P>
        <UL items={[
          "Maintaining the confidentiality of your account credentials",
          "All activities that occur under your account",
          "Notifying us immediately of any unauthorized use of your account",
          "Ensuring your account information is accurate and up to date",
        ]} />
        <P>You must be at least 18 years old to create an account. By registering, you represent that you meet this requirement. We reserve the right to terminate accounts that provide false information.</P>
      </Section>

      <Section title="4. Credits and Payments">
        <Highlight>Credits are non-refundable once purchased, except as expressly stated in our Refund Policy.</Highlight>
        <P>Credits are the in-platform currency used to access AI features. Credit costs vary by feature and by the options you choose, and the exact cost of each action is always shown in the app before you confirm it.</P>
        <P>Subscription plans automatically renew at the end of each billing period unless cancelled prior to the renewal date. You authorize us to charge your payment method on file for each renewal. Credits from monthly plans do not roll over to the next billing period unless otherwise stated in your plan description.</P>
        <P>Prices are shown at checkout in the applicable currency for your region (currently US Dollars or Indian Rupees). We reserve the right to change pricing with 14 days' notice to subscribers.</P>
      </Section>

      <Section title="5. Acceptable Use">
        <P>You agree not to use the Service to create, upload, generate, or distribute content that:</P>
        <UL items={[
          "Violates any applicable local, national, or international law or regulation",
          "Is defamatory, obscene, abusive, threatening, harassing, or hateful",
          "Infringes the intellectual property rights of any third party",
          "Impersonates any person, organization, or entity",
          "Contains malware, viruses, or any malicious code",
          "Is used for spam, phishing, or unsolicited mass communications",
          "Involves unauthorized data collection or surveillance of others",
          "Promotes illegal activities or violence",
        ]} />
        <P>We employ automated content screening to detect and block prompts or inputs that violate these policies. Attempts to circumvent content filters — including prompt injection, encoding tricks, or using indirect language to generate prohibited content — are a material breach of these Terms and grounds for immediate account termination.</P>
        <P>We reserve the right to remove any content and suspend or terminate accounts found to be in violation of these policies without prior notice.</P>
      </Section>

      <Section title="6. Intellectual Property">
        <P><strong style={{ color: "#fff" }}>Your content:</strong> You retain full ownership of the videos, scripts, and creative output you generate using the Service. By using the Service, you grant us a limited, non-exclusive license to process your inputs and store your outputs solely for the purpose of providing the Service.</P>
        <P><strong style={{ color: "#fff" }}>Our platform:</strong> The Service, including its software, AI models, layout systems, design assets, branding, and underlying technology, is owned exclusively by PX Galaxy Studio and protected by applicable intellectual property laws. You may not copy, reproduce, modify, reverse engineer, or create derivative works from any part of our platform without written permission.</P>
        <P>The Vidquence name, logo, and associated marks are trademarks of PX Galaxy Studio. Unauthorized use of our trademarks is prohibited.</P>
      </Section>

      <Section title="7. AI-Generated Content">
        <Highlight>You are solely responsible for reviewing all AI-generated content before publishing, sharing, or distributing it.</Highlight>
        <P>The Service uses artificial intelligence to generate scripts, images, voiceovers, and video structures. AI-generated content may occasionally be inaccurate, biased, incomplete, or inappropriate. We do not guarantee the accuracy, quality, or suitability of AI outputs for any particular purpose.</P>
        <P>You acknowledge that:</P>
        <UL items={[
          "AI-generated images may occasionally resemble real people or copyrighted works — review before publishing",
          "AI scripts may contain factual errors — verify before distribution",
          "We are not liable for consequences arising from unreviewed AI output you distribute",
          "You must comply with platform policies (YouTube, Instagram, TikTok, etc.) independently",
        ]} />
      </Section>

      <Section title="8. Connected Accounts and Publishing">
        <P>The Service lets you connect third-party accounts (such as YouTube) and authorize Vidquence to publish videos to those accounts on your behalf, including on an automated or scheduled basis that you configure.</P>
        <P>By connecting an account and using these features, you represent and agree that:</P>
        <UL items={[
          "You own or are authorized to manage each connected account and to publish content to it",
          "You will comply with the terms, policies, and community guidelines of each connected platform (for example, the YouTube Terms of Service) independently of these Terms",
          "You are solely responsible for the content you publish through the Service and for any consequences of publishing it",
          "You authorize Vidquence to access and act on the connected account only to the extent needed to provide the features you request, as described in our Privacy Policy",
        ]} />
        <P>You may disconnect any connected account at any time, which revokes Vidquence's access and stops further publishing to it. We are not responsible for actions taken by third-party platforms — including content removal, demonetization, rate limiting, or account suspension — or for a platform's availability, policies, or changes to its API. Publishing may also be delayed or limited by a platform's own quotas and limits.</P>
      </Section>

      <Section title="9. Termination">
        <P>We may suspend or terminate your account at our sole discretion, without notice, for conduct that we determine violates these Terms, is harmful to other users, third parties, or the Service, or for any other reason we deem appropriate.</P>
        <P>You may terminate your account at any time by contacting support. Upon termination, your right to use the Service ceases immediately. Credits remaining at termination are forfeited and are not refundable unless required by applicable law.</P>
        <P>Sections on Intellectual Property, Limitation of Liability, and Governing Law survive termination.</P>
      </Section>

      <Section title="10. Limitation of Liability">
        <P>To the fullest extent permitted by applicable law, PX Galaxy Studio, its proprietor, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, goodwill, or business interruption, arising from:</P>
        <UL items={[
          "Your use of or inability to use the Service",
          "Any content generated by AI tools within the Service",
          "Unauthorized access to or alteration of your data",
          "Any third-party services integrated with the platform",
        ]} />
        <P>Our total liability to you for any claim arising out of or related to these Terms or the Service shall not exceed the amount you paid us in the 3 months preceding the claim.</P>
        <P>The Service is provided "as is" and "as available" without warranties of any kind, express or implied.</P>
      </Section>

      <Section title="11. Governing Law">
        <P>These Terms are governed by and construed in accordance with the laws of India. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts having jurisdiction over the registered office of PX Galaxy Studio, India.</P>
        <P>If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.</P>
      </Section>

      <Section title="12. Marketing Communications">
        <P>By creating an account, you agree to receive transactional emails related to your account, billing, and service updates. We may also send you product announcements and promotional emails from time to time.</P>
        <P>You may opt out of marketing emails at any time by clicking the unsubscribe link in any promotional email or by contacting us at hello@vidquence.com. Opting out of marketing emails does not affect delivery of transactional emails (such as billing receipts, password resets, and account alerts) which are necessary for the operation of your account.</P>
      </Section>

      <Section title="13. Contact">
        <P>For questions about these Terms, please contact us:</P>
        <ContactBlock email="hello@vidquence.com" />
      </Section>

    </LegalLayout>
  );
}
