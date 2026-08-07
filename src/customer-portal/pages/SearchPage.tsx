// ============================================================
// Customer Portal V2 — Global Search Page
// ============================================================
// Unified search by VRN, chassis, job card, invoice, or vehicle model.

import React, { useState, useRef, useCallback } from "react";
import { globalSearch } from "../hooks/useCustomerApi";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";

type FilterType = "all" | "vehicle" | "job" | "document";

interface SearchResult {
  type: "vehicle" | "active_job" | "past_job" | "document";
  id: string;
  title: string;
  subtitle: string;
  vrn?: string;
  meta?: string;
}

interface SearchPageProps {
  onNavigate?: (tab: string, context?: Record<string, string>) => void;
}

export function SearchPage({ onNavigate }: SearchPageProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const FILTERS: { id: FilterType; label: string }[] = [
    { id: "all", label: "All" },
    { id: "vehicle", label: "🚗 Vehicles" },
    { id: "job", label: "🔧 Jobs" },
    { id: "document", label: "📁 Documents" },
  ];

  const RESULT_ICONS: Record<string, string> = {
    vehicle: "🚗",
    active_job: "🔧",
    past_job: "📋",
    document: "📄",
  };

  const RESULT_LABELS: Record<string, string> = {
    vehicle: "Vehicle",
    active_job: "Active Job",
    past_job: "Past Job",
    document: "Document",
  };

  const doSearch = useCallback(async (q: string, f: FilterType) => {
    if (q.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const result = await globalSearch(q, f);
      if (result.success) {
        setResults(result.results || []);
      }
    } catch {
      // silent fail on search
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val, filter), 400);
  };

  const handleFilterChange = (f: FilterType) => {
    setFilter(f);
    if (query.trim().length >= 2) doSearch(query, f);
  };

  const handleResultTap = (result: SearchResult) => {
    if (!onNavigate) return;
    if (result.type === "vehicle") {
      onNavigate("vehicles", { vrn: result.id });
    } else if (result.type === "active_job" || result.type === "past_job") {
      onNavigate("vehicles", { jobCardNo: result.id });
    } else if (result.type === "document") {
      onNavigate("vault");
    }
  };

  const filteredResults = filter === "all" ? results : results.filter((r) => {
    if (filter === "vehicle") return r.type === "vehicle";
    if (filter === "job") return r.type === "active_job" || r.type === "past_job";
    if (filter === "document") return r.type === "document";
    return true;
  });

  return (
    <div style={s.page}>
      {/* Search Input */}
      <div style={s.searchBar}>
        <span style={s.searchIcon}>🔍</span>
        <input
          style={s.searchInput}
          type="text"
          placeholder="Search VRN, Job Card, Invoice, Chassis…"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          autoFocus
        />
        {query && (
          <button style={s.clearBtn} onClick={() => { setQuery(""); setResults([]); setHasSearched(false); }}>✕</button>
        )}
      </div>

      {/* Filter Chips */}
      <div style={s.filters}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            style={{ ...s.filterChip, ...(filter === f.id ? s.filterChipActive : {}) }}
            onClick={() => handleFilterChange(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <SkeletonLoader type="notification-row" count={4} />
      ) : !hasSearched ? (
        <div style={s.hint}>
          <div style={s.hintIcon}>🔍</div>
          <div style={s.hintText}>
            <strong>Search anything</strong><br />
            Try a registration number, job card number, invoice number, or vehicle model.
          </div>
        </div>
      ) : filteredResults.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No Results Found"
          subtitle={`No matches found for "${query}". Try a different keyword or check the spelling.`}
        />
      ) : (
        <div style={s.resultsList}>
          <div style={s.resultCount}>{filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""}</div>
          {filteredResults.map((r) => (
            <div key={`${r.type}-${r.id}`} style={s.resultCard} onClick={() => handleResultTap(r)}>
              <div style={s.resultIcon}>{RESULT_ICONS[r.type]}</div>
              <div style={s.resultContent}>
                <div style={s.resultTypeBadge}>{RESULT_LABELS[r.type]}</div>
                <div style={s.resultTitle}>{r.title}</div>
                <div style={s.resultSubtitle}>{r.subtitle}</div>
                {r.vrn && (
                  <div style={s.resultVrn}>{r.vrn}</div>
                )}
                {r.meta && <div style={s.resultMeta}>{r.meta}</div>}
              </div>
              <span style={s.resultArrow}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const c = { primary: "#1e3a5f", text: "#1a1a2e", textSecondary: "#64748b", border: "#e2e8f0", accent: "#d4a844" };
const s: Record<string, React.CSSProperties> = {
  page: { paddingBottom: 32 },
  searchBar: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#fff", borderRadius: 16, padding: "4px 14px",
    border: `2px solid ${c.primary}`,
    boxShadow: "0 4px 16px rgba(30,58,95,0.12)",
    marginBottom: 14,
  },
  searchIcon: { fontSize: 20, flexShrink: 0 },
  searchInput: {
    flex: 1, border: "none", outline: "none",
    fontSize: 16, padding: "10px 0",
    fontFamily: "'Inter', sans-serif", background: "transparent", color: c.text,
  },
  clearBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 16, color: c.textSecondary, padding: "0 4px" },
  filters: { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" as const },
  filterChip: {
    padding: "6px 14px", borderRadius: 20, border: `1px solid ${c.border}`,
    background: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 500, color: c.textSecondary,
  },
  filterChipActive: { background: c.primary, color: "#fff", border: `1px solid ${c.primary}`, fontWeight: 700 },
  hint: {
    display: "flex", gap: 14, alignItems: "flex-start",
    background: "#f8fafc", borderRadius: 14, padding: 16, marginTop: 8,
  },
  hintIcon: { fontSize: 28, flexShrink: 0 },
  hintText: { fontSize: 14, color: c.textSecondary, lineHeight: 1.6 },
  resultCount: { fontSize: 12, color: c.textSecondary, marginBottom: 8 },
  resultsList: {},
  resultCard: {
    display: "flex", gap: 12, alignItems: "center",
    background: "#fff", borderRadius: 14, padding: "12px 14px",
    border: `1px solid ${c.border}`, marginBottom: 8,
    cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  resultIcon: { fontSize: 28, flexShrink: 0 },
  resultContent: { flex: 1 },
  resultTypeBadge: {
    display: "inline-block", fontSize: 10, fontWeight: 700, color: c.primary,
    background: "#e8f0fe", borderRadius: 6, padding: "1px 6px", marginBottom: 3,
  },
  resultTitle: { fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 2 },
  resultSubtitle: { fontSize: 12, color: c.textSecondary, lineHeight: 1.4 },
  resultVrn: {
    display: "inline-block", marginTop: 4,
    background: c.primary, color: "#fff", borderRadius: 6, padding: "1px 8px",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
  },
  resultMeta: { fontSize: 11, color: "#94a3b8", marginTop: 3 },
  resultArrow: { fontSize: 22, color: c.textSecondary, flexShrink: 0 },
};
