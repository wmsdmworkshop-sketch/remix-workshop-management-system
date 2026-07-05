// ==========================================
// Customer Portal — Root Application
// ==========================================
// Warm white + deep blue/gold theme. Mobile-first, bottom tab bar.
// Visually distinct from the dark workshop UI.

import React, { useState, useEffect } from "react";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { ChatPage } from "./pages/ChatPage";
import { ProfilePage } from "./pages/ProfilePage";
import { isLoggedIn, getCustomerInfo, logout } from "./hooks/useCustomerApi";

type TabId = "vehicles" | "chat" | "profile";
type View = { page: "dashboard" } | { page: "job-detail"; jobCardNo: string };

export default function CustomerPortalApp() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [activeTab, setActiveTab] = useState<TabId>("vehicles");
  const [currentView, setCurrentView] = useState<View>({ page: "dashboard" });
  const customer = getCustomerInfo();

  useEffect(() => {
    // Check login state on mount
    setLoggedIn(isLoggedIn());
  }, []);

  const handleLoginSuccess = () => {
    setLoggedIn(true);
  };

  const handleJobClick = (jobCardNo: string) => {
    setCurrentView({ page: "job-detail", jobCardNo });
  };

  const handleBack = () => {
    setCurrentView({ page: "dashboard" });
  };

  if (!loggedIn) {
    return <LoginPage onSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={styles.container}>
      {/* Header Bar */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>D</div>
            <div>
              <div style={styles.logoTitle}>DWIP</div>
              <div style={styles.logoSubtitle}>Devanand Motors</div>
            </div>
          </div>
          <div style={styles.headerRight}>
            <span style={styles.greeting}>Hi, {customer.name.split(" ")[0]}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={styles.main}>
        {activeTab === "vehicles" && (
          currentView.page === "dashboard" ? (
            <DashboardPage onJobClick={handleJobClick} />
          ) : (
            <JobDetailPage
              jobCardNo={currentView.jobCardNo}
              onBack={handleBack}
            />
          )
        )}
        {activeTab === "chat" && <ChatPage />}
        {activeTab === "profile" && (
          <ProfilePage
            name={customer.name}
            mobile={customer.mobile}
            onLogout={() => { logout(); setLoggedIn(false); }}
          />
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav style={styles.tabBar}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === "vehicles" ? styles.tabActive : {}),
          }}
          onClick={() => { setActiveTab("vehicles"); setCurrentView({ page: "dashboard" }); }}
        >
          <span style={styles.tabIcon}>🚗</span>
          <span style={styles.tabLabel}>My Vehicles</span>
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === "chat" ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab("chat")}
        >
          <span style={styles.tabIcon}>💬</span>
          <span style={styles.tabLabel}>Assistant</span>
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === "profile" ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab("profile")}
        >
          <span style={styles.tabIcon}>👤</span>
          <span style={styles.tabLabel}>Profile</span>
        </button>
      </nav>
    </div>
  );
}

// ---- Inline Styles (High-Contrast Mobile Theme) ----
const colors = {
  bg: "#fafaf9",
  surface: "#ffffff",
  primary: "#1e3a5f",
  primaryLight: "#2d5a8e",
  accent: "#d4a844",
  accentLight: "#f0d68a",
  text: "#1a1a2e",
  textSecondary: "#64748b",
  border: "#e2e8f0",
  success: "#059669",
  warning: "#d97706",
  danger: "#dc2626",
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100vw",
    backgroundColor: colors.bg,
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: colors.text,
    overflow: "hidden",
  },
  header: {
    backgroundColor: colors.primary,
    padding: "12px 16px",
    paddingTop: "env(safe-area-inset-top, 12px)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    zIndex: 100,
  },
  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: 600,
    margin: "0 auto",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.accent,
    color: colors.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 18,
  },
  logoTitle: {
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: 1,
  },
  logoSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  greeting: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 500,
  },
  main: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch" as any,
    padding: "16px",
    paddingBottom: "80px",
    maxWidth: 600,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  },
  tabBar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    backgroundColor: "#ffffff",
    borderTop: `1px solid ${colors.border}`,
    paddingBottom: "env(safe-area-inset-bottom, 8px)",
    paddingTop: 6,
    zIndex: 100,
    boxShadow: "0 -2px 10px rgba(0,0,0,0.06)",
  },
  tab: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 0",
    border: "none",
    background: "none",
    cursor: "pointer",
    color: colors.textSecondary,
    transition: "color 0.2s",
  },
  tabActive: {
    color: colors.primary,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.3,
  },
};
