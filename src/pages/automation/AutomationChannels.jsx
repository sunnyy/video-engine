import { ChannelsPanel } from "../SocialAccounts";

/**
 * Automation → Channels tab. Renders the Social Accounts panel (connect/disconnect the social
 * channels you publish to) inside the Automation chrome. Open to all plans — connected channels
 * power both automation campaigns and the editor's Publish button. The OAuth callback returns to
 * /automation/channels?connected=… (ChannelsPanel reads that and toasts).
 */
export default function AutomationChannels() {
  return <ChannelsPanel embedded />;
}
