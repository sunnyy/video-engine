import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { getSession, onAuthStateChange } from "./services/auth/authService";
import { setInsufficientCreditsHandler } from "./services/serverApi";
import { initLayoutRegistry } from "./core/registries/layoutRegistry";
import { useCreditsStore } from "./store/useCreditsStore";
import "./App.css"
import LandingPage     from "./pages/LandingPage";
import TermsOfService  from "./pages/legal/TermsOfService";
import PrivacyPolicy   from "./pages/legal/PrivacyPolicy";
import RefundPolicy    from "./pages/legal/RefundPolicy";
import About           from "./pages/About";
import Auth            from "./pages/Auth";
import ResetPassword   from "./pages/ResetPassword";
import Dashboard       from "./pages/Dashboard";
import Videos         from "./pages/Videos";
import VideoGenerator  from "./pages/VideoGenerator";
import Editor          from "./pages/Editor";
import AdminDashboard  from "./pages/admin/AdminDashboard";
import UserManager     from "./pages/admin/UserManager";
import LayoutManager   from "./pages/admin/LayoutManager";
import LayoutEditor    from "./pages/admin/LayoutEditor";
import LayoutGenerator from "./pages/admin/LayoutGenerator";
import ImageGeneration from "./pages/ImageGeneration";
import Transcription   from "./pages/SpeechToText";
import Feedback        from "./pages/Feedback";
import Checkout        from "./pages/Checkout";
import Assets          from "./pages/Assets";
import CreditsPage     from "./pages/Credits";
import Settings        from "./pages/Settings";
import ProductAds      from "./pages/ProductAds";
import NewProductAd    from "./pages/NewProductAd";
import PosterStudio         from "./pages/ProductPoster";
import Thumbnails           from "./pages/Thumbnails";
import ThumbnailGenerator   from "./pages/ThumbnailGenerator";
import TTSStudio       from "./pages/Voiceover";
import CaptionStudio      from "./pages/VideoCaptions";
import TypographyVideo    from "./pages/TypographyVideo";
import ExplainerVideo     from "./pages/ExplainerVideo";
import CustomVideos       from "./pages/CustomVideos";
import OutfitStudio              from "./pages/VirtualTryOn";
import SocialPostGenerator       from "./pages/BannerDesign";
import ImageLibrary    from "./pages/admin/ImageLibrary";
import Analytics       from "./pages/admin/Analytics";
import Credits         from "./pages/admin/Credits";
import Plans           from "./pages/admin/Plans";
import Sales           from "./pages/admin/Sales";
import System          from "./pages/admin/System";
import ModelAvatars    from "./pages/admin/ModelAvatars";
import AdminFeedback   from "./pages/admin/Feedback";
import MusicLibrary   from "./pages/admin/MusicLibrary";
import SFXLibrary     from "./pages/admin/SFXLibrary";
import Samples        from "./pages/admin/Samples";
import RefundClaims   from "./pages/admin/RefundClaims";

export default function App() {
  const [session,    setSession]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [recovering, setRecovering] = useState(false);
  const fetchCredits           = useCreditsStore(s => s.fetchCredits);
  const fetchCreditsForNewUser = useCreditsStore(s => s.fetchCreditsForNewUser);

  useEffect(() => {
    initLayoutRegistry().catch(() => {});

    setInsufficientCreditsHandler(() => {
      alert("Not enough credits. Purchase more to continue.");
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
        // New accounts (created within last 15s): poll briefly in case the
        // DB trigger hasn't committed yet. Existing users: single fetch.
        const isNewUser = sess?.user?.created_at &&
          Date.now() - new Date(sess.user.created_at).getTime() < 15_000;
        if (isNewUser) fetchCreditsForNewUser(); else fetchCredits();
      } else if (event === "SIGNED_OUT") {
        setRecovering(false);
        setSession(null);
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
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<ResetPassword onDone={() => setRecovering(false)} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes — always accessible ── */}
        <Route path="/"              element={<LandingPage />} />
        <Route path="/about"         element={<About />} />
        <Route path="/terms"         element={<TermsOfService />} />
        <Route path="/privacy"       element={<PrivacyPolicy />} />
        <Route path="/refunds"       element={<RefundPolicy />} />
        <Route path="/pricing"       element={<Navigate to="/#pricing" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* /login → redirect to /dashboard if already signed in */}
        <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <Auth />} />

        {/* ── Protected app routes ── */}
        {session ? (
          <>
            <Route path="/dashboard"        element={<Dashboard />} />
            <Route path="/videos"           element={<Videos />} />
            <Route path="/new"              element={<VideoGenerator />} />
            <Route path="/image-generation" element={<ImageGeneration />} />
            <Route path="/speech-to-text"   element={<Transcription />} />
            <Route path="/video-captions"      element={<CaptionStudio />} />
            <Route path="/videos/typography"   element={<TypographyVideo />} />
            <Route path="/videos/explainer"    element={<ExplainerVideo />} />
            <Route path="/videos/custom"       element={<CustomVideos />} />
            <Route path="/feedback"         element={<Feedback />} />
            <Route path="/checkout"         element={<Checkout />} />
            <Route path="/assets"           element={<Assets />} />
            <Route path="/credits"          element={<CreditsPage />} />
            <Route path="/settings"         element={<Settings />} />
            <Route path="/editor/:id"       element={<Editor />} />
            <Route path="/product-ads"       element={<ProductAds />} />
            <Route path="/product-ads/new"   element={<NewProductAd />} />
            <Route path="/product-ad-studio" element={<ProductAds />} />
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
                <Route path="/admin/analytics"         element={<Analytics />} />
                <Route path="/admin/users"             element={<UserManager />} />
                <Route path="/admin/credits"           element={<Credits />} />
                <Route path="/admin/plans"             element={<Plans />} />
                <Route path="/admin/sales"             element={<Sales />} />
                <Route path="/admin/system"            element={<System />} />
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
              </>
            ) : (
              <Route path="/admin/*" element={<Navigate to="/dashboard" />} />
            )}

            {/* Unknown routes → app home */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </>
        ) : (
          /* Unauthenticated → gate to login */
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
