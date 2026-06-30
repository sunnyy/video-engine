import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { getSession, onAuthStateChange } from "./services/auth/authService";
import posthog from "posthog-js";
import { setInsufficientCreditsHandler } from "./services/serverApi";
import { captureRefFromUrl, claimStoredReferral } from "./services/referrals/referralService";
import { ToastContainer, showToast } from "./ui/Toast";
import { initLayoutRegistry } from "./core/registries/layoutRegistry";
import { useCreditsStore } from "./store/useCreditsStore";
import "./App.css"
import LandingPage     from "./pages/LandingPage";
import AivLab          from "./pages/AivLab";
import HostGuard       from "./ui/HostGuard";
import TermsOfService  from "./pages/legal/TermsOfService";
import PrivacyPolicy   from "./pages/legal/PrivacyPolicy";
import RefundPolicy    from "./pages/legal/RefundPolicy";
import CookiePolicy    from "./pages/legal/CookiePolicy";
import About           from "./pages/About";
import FAQ             from "./pages/FAQ";
import StatusPage      from "./pages/StatusPage";
import Support         from "./pages/Support";
import HelpCenter      from "./pages/HelpCenter";
import HelpArticle     from "./pages/HelpArticle";
import Auth            from "./pages/Auth";
import ResetPassword   from "./pages/ResetPassword";
import Dashboard       from "./pages/Dashboard";
import Projects       from "./pages/Projects";
import Notifications  from "./pages/Notifications";
import Invite         from "./pages/Invite";
import Explore        from "./pages/Explore";
import Videos         from "./pages/Videos";
import AdminDashboard  from "./pages/admin/AdminDashboard";
import UserManager     from "./pages/admin/UserManager";
import LayoutManager   from "./pages/admin/LayoutManager";
import LayoutEditor    from "./pages/admin/LayoutEditor";
import LayoutGenerator from "./pages/admin/LayoutGenerator";
import ImageGeneration from "./pages/ImageGeneration";
import Transcription   from "./pages/SpeechToText";
import Feedback        from "./pages/Feedback";
import Checkout        from "./pages/Checkout";
import CreditsPage     from "./pages/Credits";
import Settings        from "./pages/Settings";
import ProductVideoGenerator from "./pages/ProductVideoGenerator";
import TypographyVideo       from "./pages/TypographyVideo";
import SocialVideo           from "./pages/SocialVideo";
import SaasVideo            from "./pages/SaasVideo";
import PromptVideo           from "./pages/PromptVideo";
import BrandKit              from "./pages/BrandKit";
import Automation          from "./pages/Automation";
import SocialAccounts      from "./pages/SocialAccounts";
import CampaignDetail      from "./pages/CampaignDetail";
import PosterStudio         from "./pages/ProductPoster";
import Thumbnails           from "./pages/Thumbnails";
import ThumbnailGenerator   from "./pages/ThumbnailGenerator";
import TTSStudio       from "./pages/Voiceover";
import CaptionStudio      from "./pages/VideoCaptions";
import TalkingHead        from "./pages/TalkingHead";
import VideoClipping      from "./pages/VideoClipping";
import VideoEditor        from "./pages/VideoEditor";
import OutfitStudio              from "./pages/VirtualTryOn";
import SocialPostGenerator       from "./pages/BannerDesign";
import ImageLibrary    from "./pages/admin/ImageLibrary";
import Analytics       from "./pages/admin/Analytics";
import Credits         from "./pages/admin/Credits";
import Plans           from "./pages/admin/Plans";
import Sales           from "./pages/admin/Sales";
import System          from "./pages/admin/System";
import Monitoring       from "./pages/admin/Monitoring";
import AutomationCampaigns from "./pages/admin/AutomationCampaigns";
import ModelAvatars    from "./pages/admin/ModelAvatars";
import AdminFeedback   from "./pages/admin/Feedback";
import MusicLibrary   from "./pages/admin/MusicLibrary";
import SFXLibrary     from "./pages/admin/SFXLibrary";
import Samples        from "./pages/admin/Samples";
import RefundClaims   from "./pages/admin/RefundClaims";
import AnnouncementCenter from "./pages/admin/AnnouncementCenter";
import AdminSupport   from "./pages/admin/Support";
import AdminReferrals from "./pages/admin/Referrals";
import AdminCoupons   from "./pages/admin/Coupons";
import AdminHelpCenter from "./pages/admin/HelpCenter";

export default function App() {
  const [session,    setSession]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [recovering, setRecovering] = useState(false);
  const fetchCredits           = useCreditsStore(s => s.fetchCredits);
  const fetchCreditsForNewUser = useCreditsStore(s => s.fetchCreditsForNewUser);

  useEffect(() => {
    initLayoutRegistry().catch(() => {});

    // Capture a referral code from ?ref= before anything navigates it away.
    captureRefFromUrl();

    setInsufficientCreditsHandler(() => {
      showToast("Not enough credits. Purchase more to continue.");
    });

    getSession().then((sess) => {
      setSession(sess);
      setLoading(false);
      if (sess) fetchCredits();
    });

    const sub = onAuthStateChange((event, sess) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecovering(true);
        setSession(sess);
      } else if (event === "SIGNED_IN") {
        setRecovering(false);
        setSession(sess);
        posthog.identify(sess.user.id, {
          email: sess.user.email,
          name: sess.user.user_metadata?.full_name || sess.user.user_metadata?.name || "",
        });
        // New accounts (created within last 15s): poll briefly in case the
        // DB trigger hasn't committed yet. Existing users: single fetch.
        const isNewUser = sess?.user?.created_at &&
          Date.now() - new Date(sess.user.created_at).getTime() < 15_000;
        if (isNewUser) fetchCreditsForNewUser(); else fetchCredits();
        // Attribute a pending referral (server validates it's a genuinely new account).
        claimStoredReferral().then((r) => { if (r?.claimed) fetchCredits(); });
      } else if (event === "SIGNED_OUT") {
        setRecovering(false);
        setSession(null);
        posthog.reset();
      } else if (event === "USER_UPDATED") {
        setRecovering(false);
        setSession(sess);
      }
    });

    return () => sub.unsubscribe();
  }, []);

  if (loading) return null;

  const isAdmin = session?.user?.app_metadata?.role === "admin";

  if (recovering) {
    return (
      <>
      <ToastContainer />
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<ResetPassword onDone={() => setRecovering(false)} />} />
        </Routes>
      </BrowserRouter>
      </>
    );
  }

  return (
    <>
    <ToastContainer />
    <BrowserRouter>
      <HostGuard />
      <Routes>
        {/* ── Public routes — always accessible ── */}
        <Route path="/"              element={<LandingPage />} />
        <Route path="/about"         element={<About />} />
        <Route path="/faq"           element={<FAQ />} />
        <Route path="/status"        element={<StatusPage />} />
        <Route path="/help"          element={<HelpCenter />} />
        <Route path="/help/:slug"    element={<HelpArticle />} />
        <Route path="/terms"         element={<TermsOfService />} />
        <Route path="/privacy"       element={<PrivacyPolicy />} />
        <Route path="/refunds"       element={<RefundPolicy />} />
        <Route path="/cookies"       element={<CookiePolicy />} />
        <Route path="/pricing"       element={<Navigate to="/#pricing" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* /login → redirect to /dashboard if already signed in */}
        <Route path="/login" element={session ? <Navigate to={new URLSearchParams(window.location.search).get("next") || "/dashboard"} replace /> : <Auth />} />

        {/* ── Protected app routes ── */}
        {session ? (
          <>
            <Route path="/dashboard"        element={<Dashboard />} />
            <Route path="/projects"         element={<Projects />} />
            <Route path="/notifications"    element={<Notifications />} />
            <Route path="/support"          element={<Support />} />
            <Route path="/invite"           element={<Invite />} />
            <Route path="/explore"          element={<Explore />} />
            <Route path="/videos"           element={<Videos />} />
            <Route path="/image-generation" element={<ImageGeneration />} />
            <Route path="/speech-to-text"   element={<Transcription />} />
            <Route path="/video-captions"      element={<CaptionStudio />} />
            <Route path="/feedback"         element={<Feedback />} />
            <Route path="/checkout"         element={<Checkout />} />
            <Route path="/credits"          element={<CreditsPage />} />
            <Route path="/settings"         element={<Settings />} />
            <Route path="/brand-kit"        element={<BrandKit />} />
            <Route path="/automation"       element={<Automation />} />
            <Route path="/connections"      element={<SocialAccounts />} />
            <Route path="/automation/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/video-editor/:id" element={<VideoEditor />} />
            <Route path="/promo-video"             element={<SaasVideo />} />
            <Route path="/promo-video/:projectId"  element={<SaasVideo />} />
            <Route path="/product-video"      element={<ProductVideoGenerator />} />
            <Route path="/ai-video"       element={<PromptVideo />} />
            <Route path="/talking-head"   element={<TalkingHead />} />
            <Route path="/video-clipping" element={<VideoClipping />} />
            <Route path="/typography-video"   element={<TypographyVideo />} />
            <Route path="/social-video"       element={<SocialVideo />} />
            <Route path="/product-poster"    element={<PosterStudio />} />
            <Route path="/thumbnail"           element={<Thumbnails />} />
            <Route path="/thumbnail/new"       element={<ThumbnailGenerator />} />
            <Route path="/voiceover"         element={<TTSStudio />} />
            <Route path="/virtual-tryon"     element={<OutfitStudio />} />
            <Route path="/banner-design"     element={<SocialPostGenerator />} />

            {/* Admin routes */}
            {isAdmin ? (
              <>
                <Route path="/admin"                   element={<AdminDashboard />} />
                <Route path="/admin/aiv-lab"           element={<AivLab />} />
                <Route path="/admin/analytics"         element={<Analytics />} />
                <Route path="/admin/users"             element={<UserManager />} />
                <Route path="/admin/credits"           element={<Credits />} />
                <Route path="/admin/plans"             element={<Plans />} />
                <Route path="/admin/sales"             element={<Sales />} />
                <Route path="/admin/system"            element={<System />} />
                <Route path="/admin/monitoring"        element={<Monitoring />} />
                <Route path="/admin/campaigns"         element={<AutomationCampaigns />} />
                <Route path="/admin/layouts"           element={<LayoutManager />} />
                <Route path="/admin/ai-generator"      element={<LayoutGenerator />} />
                <Route path="/admin/layouts/:layoutId" element={<LayoutEditor />} />
                <Route path="/admin/library"           element={<ImageLibrary />} />
                <Route path="/admin/model-avatars"    element={<ModelAvatars />} />
                <Route path="/admin/feedback"         element={<AdminFeedback />} />
                <Route path="/admin/music"            element={<MusicLibrary />} />
                <Route path="/admin/sfx"              element={<SFXLibrary />} />
                <Route path="/admin/samples"          element={<Samples />} />
                <Route path="/admin/refund-claims"   element={<RefundClaims />} />
                <Route path="/admin/announcements"   element={<AnnouncementCenter />} />
                <Route path="/admin/support"         element={<AdminSupport />} />
                <Route path="/admin/referrals"       element={<AdminReferrals />} />
                <Route path="/admin/coupons"         element={<AdminCoupons />} />
                <Route path="/admin/help"            element={<AdminHelpCenter />} />
              </>
            ) : (
              <Route path="/admin/*" element={<Navigate to="/dashboard" />} />
            )}

            {/* Unknown routes → app home */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </>
        ) : (
          /* Unauthenticated → homepage (login happens via the Get Started modal there) */
          <Route path="*" element={<Navigate to="/" />} />
        )}
      </Routes>
    </BrowserRouter>
    </>
  );
}
