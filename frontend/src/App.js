import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import GlobalSearch from './components/GlobalSearch';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Bookmarks from './pages/Bookmarks';
import FileOrganizer from './pages/FileOrganizer';
import PasswordAuditor from './pages/PasswordAuditor';
import DigitalDetox from './pages/DigitalDetox';
import FocusTimer from './pages/FocusTimer';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Contact from './pages/Contact';
import Feedback from './pages/Feedback';
import AdminPanel from './pages/AdminPanel';
import Onboarding from './pages/Onboarding';
import { getMe } from './services/api';
import Habits from './pages/Habits';
import Goals from './pages/Goals';
import WeeklyDigest from './pages/WeeklyDigest';
import UsageStats from './pages/UsageStats';
import CrossInsights from './pages/CrossInsights';
import GoalProgressPredict from './pages/GoalProgressPredict';
import UsageAnomalyDetect from './pages/UsageAnomalyDetect';
import FocusBoostRecommend from './pages/FocusBoostRecommend';

// // === Batch 06 Gaps & Frontend Mounts ===
import CFAgenticGoalOrchestrationPage from './pages/CFAgenticGoalOrchestrationPage';
import CFDistractionDetectorPage from './pages/CFDistractionDetectorPage';
import CFDigitalWellbeingCoachPage from './pages/CFDigitalWellbeingCoachPage';
import CFWeeklyAutopilotPage from './pages/CFWeeklyAutopilotPage';
import CFCrossToolOptimizationPage from './pages/CFCrossToolOptimizationPage';
import GapGoalsWithoutGoalPage from './pages/GapGoalsWithoutGoalPage';
import GapHabitsWithoutHabitPage from './pages/GapHabitsWithoutHabitPage';
import GapFocusWithoutFocusPage from './pages/GapFocusWithoutFocusPage';
import GapUsageWithoutUsagePage from './pages/GapUsageWithoutUsagePage';
import GapLimitedCalendarIntegrationNoNativeTaskScheduPage from './pages/GapLimitedCalendarIntegrationNoNativeTaskScheduPage';
import GapLimitedIntegrationWithCommunicationToolsEmailPage from './pages/GapLimitedIntegrationWithCommunicationToolsEmailPage';
import GapNoAiPage from './pages/GapNoAiPage';
import GapLimitedTeamCollaborationFeaturesPage from './pages/GapLimitedTeamCollaborationFeaturesPage';
import GapNoIntegrationWithFitnessHealthActivitySleepPage from './pages/GapNoIntegrationWithFitnessHealthActivitySleepPage';
import GapWebhookScaffoldingExistsButNotFullEndPage from './pages/GapWebhookScaffoldingExistsButNotFullEndPage';
import CustomViewsPage from './pages/CustomViewsPage';
import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await getMe();
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleSearch = () => setSearchOpen(!searchOpen);

  if (loading) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Public routes
  const publicPaths = ['/login', '/forgot-password', '/onboarding'];
  if (!user && !publicPaths.includes(location.pathname)) {
    return <Navigate to="/login" />;
  }

  if (location.pathname === '/login') {
    return <Login setUser={setUser} />;
  }

  if (location.pathname === '/forgot-password') {
    return <ForgotPassword />;
  }

  if (location.pathname === '/onboarding') {
    return <Onboarding />;
  }

  return (
    <div className="app" data-theme={theme}>
      <Sidebar user={user} setUser={setUser} onToggleSearch={toggleSearch} />
      <main className="main-content" role="main">
        <Routes>
        <Route path="/insights/timeline" element={<TimelineView />} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/file-organizer" element={<FileOrganizer />} />
          <Route path="/password-auditor" element={<PasswordAuditor />} />
          <Route path="/digital-detox" element={<DigitalDetox />} />
          <Route path="/focus-timer" element={<FocusTimer />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/weekly-digest" element={<WeeklyDigest />} />
          <Route path="/usage-stats" element={<UsageStats />} />
          <Route path="/cross-insights" element={<CrossInsights />} />
          <Route path="/goal-progress-predict" element={<GoalProgressPredict />} />
          <Route path="/usage-anomaly-detect" element={<UsageAnomalyDetect />} />
          <Route path="/focus-boost-recommend" element={<FocusBoostRecommend />} />
          <Route path="*" element={<Navigate to="/" />} />
        
          {/* // === Batch 06 Gaps & Frontend Mounts === */}
          <Route path="/cf-agentic-goal-orchestration" element={<CFAgenticGoalOrchestrationPage />} />
          <Route path="/cf-distraction-detector" element={<CFDistractionDetectorPage />} />
          <Route path="/cf-digital-wellbeing-coach" element={<CFDigitalWellbeingCoachPage />} />
          <Route path="/cf-weekly-autopilot" element={<CFWeeklyAutopilotPage />} />
          <Route path="/cf-cross-tool-optimization" element={<CFCrossToolOptimizationPage />} />
          <Route path="/gap-goals-without-goal" element={<GapGoalsWithoutGoalPage />} />
          <Route path="/gap-habits-without-habit" element={<GapHabitsWithoutHabitPage />} />
          <Route path="/gap-focus-without-focus" element={<GapFocusWithoutFocusPage />} />
          <Route path="/gap-usage-without-usage" element={<GapUsageWithoutUsagePage />} />
          <Route path="/gap-limited-calendar-integration-no-native-task-schedu" element={<GapLimitedCalendarIntegrationNoNativeTaskScheduPage />} />
          <Route path="/gap-limited-integration-with-communication-tools-email" element={<GapLimitedIntegrationWithCommunicationToolsEmailPage />} />
          <Route path="/gap-no-ai" element={<GapNoAiPage />} />
          <Route path="/gap-limited-team-collaboration-features" element={<GapLimitedTeamCollaborationFeaturesPage />} />
          <Route path="/gap-no-integration-with-fitness-health-activity-sleep" element={<GapNoIntegrationWithFitnessHealthActivitySleepPage />} />
          <Route path="/gap-webhook-scaffolding-exists-but-not-full-end" element={<GapWebhookScaffoldingExistsButNotFullEndPage />} />
          <Route path="/custom-views" element={<CustomViewsPage />} />
        </Routes>
      </main>
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <KeyboardShortcuts onToggleSearch={toggleSearch} />
    </div>
  );
}

export default App;
