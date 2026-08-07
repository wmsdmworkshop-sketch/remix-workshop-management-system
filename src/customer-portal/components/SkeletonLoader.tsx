// ============================================================
// Customer Portal V2 — Skeleton Loader Component
// ============================================================
// Animated loading placeholders for all major content types.

import React from "react";

type SkeletonType = "vehicle-card" | "job-card" | "timeline" | "document-row" | "notification-row" | "text-block";

interface SkeletonLoaderProps {
  type: SkeletonType;
  count?: number;
}

export function SkeletonLoader({ type, count = 1 }: SkeletonLoaderProps) {
  const items = Array.from({ length: count });
  return (
    <>
      {items.map((_, i) => (
        <div key={i} style={s.wrapper}>
          <SkeletonItem type={type} count={count} />
        </div>
      ))}
    </>
  );
}

function SkeletonItem({ type, count = 1 }: { type: SkeletonType; count?: number }) {
  switch (type) {
    case "vehicle-card":
      return (
        <div style={s.card}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <Bone w={80} h={24} r={8} />
            <Bone w={60} h={24} r={20} />
          </div>
          <Bone w="60%" h={16} r={6} mb={6} />
          <Bone w="80%" h={14} r={6} mb={12} />
          <Bone w="100%" h={12} r={6} mb={4} />
          <Bone w="100%" h={40} r={10} />
        </div>
      );
    case "job-card":
      return (
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <Bone w={100} h={22} r={8} />
            <Bone w={70} h={22} r={20} />
          </div>
          <Bone w="50%" h={14} r={6} mb={6} />
          <Bone w="70%" h={14} r={6} mb={12} />
          <Bone w="100%" h={8} r={4} mb={4} />
          <Bone w="40%" h={12} r={6} />
        </div>
      );
    case "timeline":
      return (
        <div style={{ paddingLeft: 20, position: "relative" }}>
          {Array.from({ length: count || 1 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 16, position: "relative" }}>
              <div style={{
                position: "absolute", left: -16, top: 14,
                width: 10, height: 10, borderRadius: "50%",
                background: "#e2e8f0",
              }} />
              <div style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Bone w={90} h={16} r={6} />
                  <Bone w={60} h={16} r={20} />
                </div>
                <Bone w="40%" h={12} r={6} mb={6} />
                <Bone w="70%" h={14} r={6} />
              </div>
            </div>
          ))}
        </div>
      );
    case "document-row":
      return (
        <div style={{ ...s.card, display: "flex", gap: 12, alignItems: "center" }}>
          <Bone w={44} h={44} r={10} />
          <div style={{ flex: 1 }}>
            <Bone w="50%" h={14} r={6} mb={6} />
            <Bone w="70%" h={12} r={6} />
          </div>
          <Bone w={60} h={28} r={8} />
        </div>
      );
    case "notification-row":
      return (
        <div style={{ ...s.card, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Bone w={36} h={36} r={18} />
          <div style={{ flex: 1 }}>
            <Bone w="60%" h={14} r={6} mb={6} />
            <Bone w="80%" h={12} r={6} mb={4} />
            <Bone w="30%" h={11} r={6} />
          </div>
        </div>
      );
    case "text-block":
    default:
      return (
        <div style={s.card}>
          <Bone w="90%" h={14} r={6} mb={8} />
          <Bone w="70%" h={14} r={6} mb={8} />
          <Bone w="80%" h={14} r={6} />
        </div>
      );
  }
}

function Bone({ w, h, r = 6, mb = 0 }: { w: number | string; h: number; r?: number; mb?: number }) {
  return (
    <div style={{
      width: w,
      height: h,
      borderRadius: r,
      background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      marginBottom: mb,
      flexShrink: 0,
    }} />
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: { marginBottom: 12 },
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: "14px 16px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
};

// Inject shimmer keyframes once
if (typeof document !== "undefined" && !document.getElementById("skeleton-keyframes")) {
  const style = document.createElement("style");
  style.id = "skeleton-keyframes";
  style.textContent = `
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
}
