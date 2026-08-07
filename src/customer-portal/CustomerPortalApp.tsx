// ==========================================
// Customer Portal — Root Application (V2)
// ==========================================
// DWIP Customer Portal V2 — India's best Commercial Vehicle Portal.
// Mobile-first, one-hand operation, minimum clicks, maximum automation.
// Full integration with DWIP Enterprise Platform ERP.

import React, { useState, useEffect } from "react";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { ChatPage } from "./pages/ChatPage";
import { ProfilePage } from "./pages/ProfilePage";
import { FleetCommandConsole } from "./pages/FleetCommandConsole";
import { DigitalDocumentVault } from "./pages/DigitalDocumentVault";
import { AMCSubscriptionsPage } from "./pages/AMCSubscriptionsPage";
import { VehicleDiscoveryPage } from "./pages/VehicleDiscoveryPage";
import { VehiclePassportPage } from "./pages/VehiclePassportPage";
import { WarrantyCenterPage } from "./pages/WarrantyCenterPage";
import { NotificationCenterPage } from "./pages/NotificationCenterPage";
import { CustomerSupportPage } from "./pages/CustomerSupportPage";
import { SearchPage } from "./pages/SearchPage";
import { NotificationBadge } from "./components/NotificationBadge";
import { ThemeToggle, applyTheme, getStoredTheme } from "./components/ThemeToggle";
import { isLoggedIn, getCustomerInfo, logout } from "./hooks/useCustomerApi";

// ---- Navigation Types ----
type TabId = "vehicles" | "fleet" | "vault" | "warranty" | "support" | "profile";

type PageView =
  | { page: "dashboard" }
  | { page: "job-detail"; jobCardNo: string }
  | { page: "passport"; vrn: string }
  | { page: "search" }
  | { page: "notifications" };

// ---- Bottom Tab Definition ----
const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: "vehicles", icon: "🚗", label: "Vehicles" },
  { id: "fleet",    icon: "🚛", label: "Fleet" },
  { id: "vault",    icon: "📁", label: "Vault" },
  { id: "warranty", icon: "🛡️", label: "Warranty" },
  { id: "support",  icon: "💬", label: "Support" },
  { id: "profile",  icon: "👤", label: "Profile" },
];

export default function CustomerPortalApp() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("vehicles");
  const [mode, setMode] = useState<"individual" | "fleet">("individual");
  const [currentView, setCurrentView] = useState<PageView>({ page: "dashboard" });
  const [searchOpen, setSearchOpen] = useState(false);
  const customer = getCustomerInfo();

  // Apply stored theme on mount
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  // After login: check if first-time user (no verified vehicles flag)
  useEffect(() => {
    if (loggedIn) {
      const discovered = localStorage.getItem("dwip_discovery_done");
      if (!discovered) {
        setShowDiscovery(true);
      }
    }
  }, [loggedIn]);

  const handleLoginSuccess = () => setLoggedIn(true);

  const handleDiscoveryComplete = () => {
    localStorage.setItem("dwip_discovery_done", "1");
    setShowDiscovery(false);
  };

  const handleJobClick = (jobCardNo: string) =>
    setCurrentView({ page: "job-detail", jobCardNo });

  const handlePassportClick = (vrn: string) =>
    setCurrentView({ page: "passport", vrn });

  const handleBack = () => setCurrentView({ page: "dashboard" });

  const handleNavigate = (tab: string, context?: Record<string, string>) => {
    if (tab === "vehicles") {
      setActiveTab("vehicles");
      if (context?.jobCardNo) {
        setCurrentView({ page: "job-detail", jobCardNo: context.jobCardNo });
      } else if (context?.vrn) {
        setCurrentView({ page: "passport", vrn: context.vrn });
      } else {
        setCurrentView({ page: "dashboard" });
      }
    } else if (tab === "vault") {
      setActiveTab("vault");
    } else if (tab === "amc") {
      setActiveTab("vault"); // AMC is now under Vault tab
    } else if (tab === "warranty") {
      setActiveTab("warranty");
    } else if (tab === "fleet") {
      setActiveTab("fleet");
    }
    setSearchOpen(false);
  };

  // ---- Not Logged In ----
  if (!loggedIn) {
    return <LoginPage onSuccess={handleLoginSuccess} />;
  }

  // ---- First Login: Vehicle Discovery ----
  if (showDiscovery) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.logo}>
              <div style={styles.logoIcon}>D</div>
              <div>
                <div style={styles.logoTitle}>DWIP CUSTOMER HUB</div>
                <div style={styles.logoSubtitle}>Devanand Automobiles</div>
              </div>
            </div>
          </div>
        </header>
        <main style={styles.main}>
          <VehicleDiscoveryPage
            mobile={customer.mobile}
            onComplete={handleDiscoveryComplete}
          />
        </main>
      </div>
    );
  }

  // ---- Main App ----
  return (
    <div style={styles.container}>
      {/* ===== Header ===== */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          {/* Logo */}
          <div style={styles.logo}>
            <div style={styles.logoIcon}>D</div>
            <div>
              <div style={styles.logoTitle}>DWIP CUSTOMER HUB</div>
              <div style={styles.logoSubtitle}>Devanand Automobiles</div>
            </div>
          </div>

          {/* Header Right: Search + Mode + Notifications + Theme */}
          <div style={styles.headerRight}>
            {/* Search Button */}
            <button
              style={styles.headerIconBtn}
              onClick={() => { setSearchOpen((o) => !o); setActiveTab("vehicles"); }}
              title="Search"
            >
              🔍
            </button>

            {/* Mode Toggle */}
            <button
              onClick={() => {
                const next = mode === "individual" ? "fleet" : "individual";
                setMode(next);
                setActiveTab(next === "fleet" ? "fleet" : "vehicles");
              }}
              style={{
                ...styles.modeBtn,
                background: mode === "fleet" ? colors.accent : "rgba(255,255,255,0.15)",
                color: mode === "fleet" ? colors.primary : "#ffffff",
              }}
            >
              {mode === "fleet" ? "🚛 Fleet" : "🚗 Owner"}
            </button>

            {/* Notification Bell */}
            <NotificationBadge
              onClick={() => {
                setCurrentView({ page: "notifications" });
                setActiveTab("vehicles");
                setSearchOpen(false);
              }}
            />

            {/* Theme Toggle */}
            <ThemeToggle compact />
          </div>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main style={styles.main}>
        {/* ---- Search overlay ---- */}
        {searchOpen && (
          <SearchPage onNavigate={handleNavigate} />
        )}

        {/* ---- Vehicles Tab ---- */}
        {!searchOpen && activeTab === "vehicles" && (
          <>
            {currentView.page === "dashboard" && (
              <DashboardPage
                onJobClick={handleJobClick}
              />
            )}
            {currentView.page === "job-detail" && (
              <JobDetailPage
                jobCardNo={currentView.jobCardNo}
                onBack={handleBack}
              />
            )}
            {currentView.page === "passport" && (
              <VehiclePassportPage
                vrn={currentView.vrn}
                onBack={handleBack}
              />
            )}
            {currentView.page === "notifications" && (
              <NotificationCenterPage onNavigate={handleNavigate} />
            )}
          </>
        )}

        {/* ---- Fleet Tab ---- */}
        {!searchOpen && activeTab === "fleet" && <FleetCommandConsole />}

        {/* ---- Vault Tab (includes AMC) ---- */}
        {!searchOpen && activeTab === "vault" && (
          <div>
            <DigitalDocumentVault />
            <div style={{ marginTop: 20 }}>
              <AMCSubscriptionsPage />
            </div>
          </div>
        )}

        {/* ---- Warranty Tab ---- */}
        {!searchOpen && activeTab === "warranty" && (
          <WarrantyCenterPage />
        )}

        {/* ---- Support Tab ---- */}
        {!searchOpen && activeTab === "support" && (
          <CustomerSupportPage />
        )}

        {/* ---- Profile Tab ---- */}
        {!searchOpen && activeTab === "profile" && (
          <ProfilePage
            name={customer.name}
            mobile={customer.mobile}
            onLogout={() => { logout(); setLoggedIn(false); }}
          />
        )}
      </main>

      {/* ===== Bottom Tab Bar ===== */}
      <nav style={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id && !searchOpen ? styles.tabActive : {}),
            }}
            onClick={() => {
              setActiveTab(tab.id);
              setSearchOpen(false);
              if (tab.id === "vehicles") setCurrentView({ page: "dashboard" });
            }}
          >
            <span style={styles.tabIcon}>{tab.icon}</span>
            <span style={styles.tabLabel}>{tab.label}</span>
            {/* Active indicator bar */}
            {activeTab === tab.id && !searchOpen && (
              <span style={styles.tabIndicator} />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ---- Design Tokens ----
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
    padding: "10px 14px",
    paddingTop: "env(safe-area-inset-top, 10px)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
    zIndex: 100,
    flexShrink: 0,
  },
  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: 640,
    margin: "0 auto",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 9,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.accent,
    color: colors.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 17,
    fontFamily: "'Outfit', sans-serif",
    flexShrink: 0,
  },
  logoTitle: {
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: 0.8,
    lineHeight: 1.2,
  },
  logoSubtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  headerIconBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 10,
    padding: "5px 8px",
    fontSize: 17,
    cursor: "pointer",
    color: "#fff",
    lineHeight: 1,
  },
  modeBtn: {
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: 18,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 3,
    transition: "all 0.2s",
    flexShrink: 0,
  },
  main: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch" as any,
    padding: "14px 14px",
    paddingBottom: "88px",
    maxWidth: 640,
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
    paddingBottom: "env(safe-area-inset-bottom, 6px)",
    paddingTop: 5,
    zIndex: 100,
    boxShadow: "0 -3px 16px rgba(0,0,0,0.08)",
  },
  tab: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 2px",
    border: "none",
    background: "none",
    cursor: "pointer",
    color: colors.textSecondary,
    transition: "color 0.15s",
    position: "relative",
    minWidth: 0,
  },
  tabActive: {
    color: colors.primary,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 1,
    lineHeight: 1,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 0.2,
    textTransform: "uppercase" as const,
  },
  tabIndicator: {
    position: "absolute",
    top: 0,
    left: "25%",
    right: "25%",
    height: 3,
    borderRadius: "0 0 3px 3px",
    background: colors.primary,
  },
};
