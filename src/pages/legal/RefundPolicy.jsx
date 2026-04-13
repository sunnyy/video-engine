import LegalLayout from "./LegalLayout";
import Section, { P, UL, Highlight, ContactBlock } from "./Section";

export default function RefundPolicy() {
  return (
    <LegalLayout title="Refund Policy" lastUpdated="January 1, 2025">

      <Section title="1. Overview">
        <P>This Refund Policy governs all purchases of credits and subscription plans on Vidora, operated by PX Galaxy Studio. Please read this policy carefully before making any purchase.</P>
        <Highlight>By purchasing credits or a subscription plan, you acknowledge that you have read and agree to this Refund Policy.</Highlight>
      </Section>

      <Section title="2. Credits Are Non-Refundable Once Consumed">
        <P>Credits deducted from your balance through use of AI features — including video generation, image generation, text-to-speech, and export — are non-refundable under any circumstances once consumed.</P>
        <P>This applies regardless of:</P>
        <UL items={[
          "Satisfaction with the AI-generated output",
          "Changes to your project direction after generation",
          "Accidental triggering of a credit-consuming action",
          "Unused portions of a generation (e.g. generating 8 beats but only using 3)",
        ]} />
        <P>We strongly recommend previewing settings and reviewing available options before initiating credit-consuming operations.</P>
      </Section>

      <Section title="3. Unused Credits on Cancellation">
        <Highlight>Credits remaining in your balance at the time of plan cancellation or account closure are forfeited and are not eligible for a refund.</Highlight>
        <P>Monthly plan credits are intended for use within the billing period. We do not offer cash compensation for unused credits under any circumstances, except where explicitly required by applicable law.</P>
        <P>If you believe you have exceptional circumstances, you may contact our support team. We evaluate such requests on a case-by-case basis but are not obligated to issue refunds outside the terms stated here.</P>
      </Section>

      <Section title="4. Technical Failure Credit Restoration">
        <P>If a credit-consuming operation fails due to a verified fault on our side — such as a server error, AI provider outage, or confirmed platform bug — the credits consumed in that failed operation will be restored to your account.</P>
        <P>Qualifying technical failures include:</P>
        <UL items={[
          "Generation request that resulted in a server-side error (5xx status)",
          "AI image generation that returned no usable output due to provider failure",
          "Export operation that failed to produce a downloadable file due to our system error",
          "TTS generation that failed mid-process due to our infrastructure",
        ]} />
        <P>Non-qualifying situations (credits are not restored):</P>
        <UL items={[
          "Dissatisfaction with the quality of AI-generated output",
          "Generation completed but output does not match expectations",
          "Errors caused by user-provided inputs (e.g. invalid prompts, corrupt files)",
          "Network failures on the user's end",
        ]} />
        <P>To request credit restoration for a technical failure, contact support within 7 days of the incident with your project ID and a description of what occurred.</P>
      </Section>

      <Section title="5. Subscription Plan Cancellation">
        <P>You may cancel your subscription plan at any time through your account settings. Upon cancellation:</P>
        <UL items={[
          "Your access to paid features continues until the end of the current billing period",
          "No partial refunds are issued for the unused portion of a billing period",
          "Your account reverts to a free tier (if available) or becomes inactive at period end",
          "Unused credits from the cancelled plan are forfeited at period end",
        ]} />
        <P>Cancellation must be completed before the renewal date to avoid being charged for the next billing period. We recommend cancelling at least 24 hours before your renewal date.</P>
      </Section>

      <Section title="6. Accidental Duplicate Charges">
        <P>If you are charged more than once for the same transaction due to a payment processing error, you are entitled to a full refund of the duplicate charge. Contact us within 14 days of the duplicate charge with your transaction reference numbers and we will process a refund within 7 business days.</P>
      </Section>

      <Section title="7. Dispute Process">
        <P>If you believe you are entitled to a refund under this policy:</P>
        <UL items={[
          "Contact us at support@vidora.in within 7 days of the transaction or incident",
          "Include your account email, transaction reference or project ID, and a clear description of the issue",
          "We will acknowledge your request within 2 business days",
          "We will review and respond with a decision within 7 business days of acknowledgement",
          "Approved refunds are processed within 5–10 business days depending on your payment provider",
        ]} />
        <P>Chargebacks or payment disputes filed with your bank or card provider without first contacting us may result in suspension of your account pending investigation. We encourage direct resolution before escalating to your payment provider.</P>
      </Section>

      <Section title="8. Governing Terms">
        <P>This Refund Policy is part of and subject to our Terms of Service. In case of conflict, the Terms of Service govern. This policy is subject to applicable Indian consumer protection laws.</P>
      </Section>

      <Section title="9. Contact for Refund Requests">
        <P>All refund requests must be submitted via email. We do not process refund requests through social media or chat.</P>
        <ContactBlock email="support@vidora.in" />
      </Section>

    </LegalLayout>
  );
}
