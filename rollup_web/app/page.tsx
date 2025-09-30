"use client";

import { useEffect, useState } from "react";
import { TransactionCreator } from "@/components/transaction-creator";
import { BatchTransactionCreator } from "@/components/batch-transaction-creator";
import {
  healthCheck,
  getTransaction,
  getTransactionsPage,
  type TransactionWithHash,
  type RollupTransaction,
} from "@/lib/api";

interface HealthStatus {
  status: string;
  timestamp: number;
}

export default function RollupClientPage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [transactions, setTransactions] = useState<TransactionWithHash[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionHash, setTransactionHash] = useState("");
  const [searchResult, setSearchResult] = useState<RollupTransaction | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // wallet state
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [senderName, setSenderName] = useState("");

  const handleWalletConnect = (connected: boolean, address: string, name: string) => {
    setWalletConnected(connected);
    setWalletAddress(address);
    setSenderName(name);
  };

  useEffect(() => {
    const sol = (window as any)?.solana;
    if (sol?.isConnected && sol.publicKey) {
      setWalletConnected(true);
      setWalletAddress(sol.publicKey.toString());
      setSenderName("Phantom User");
    }
  }, []);

  const performHealthCheck = async () => {
    setIsHealthLoading(true);
    try {
      const result = await healthCheck();
      setHealthStatus({ status: JSON.stringify(result), timestamp: Date.now() });
    } catch (error) {
      setHealthStatus({
        status: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsHealthLoading(false);
    }
  };

  const loadTransactions = async (page = 1) => {
    setIsTransactionsLoading(true);
    try {
      const result = await getTransactionsPage(page, 10);
      setTransactions(result.transactions);
      setCurrentPage(page);
    } catch (e) {
      console.error("Failed to load transactions:", e);
    } finally {
      setIsTransactionsLoading(false);
    }
  };

  const searchTransaction = async () => {
    if (!transactionHash.trim()) return;
    setIsSearchLoading(true);
    try {
      const result = await getTransaction(transactionHash.trim());
      setSearchResult(result);
    } catch (error) {
      setSearchResult({ error: error instanceof Error ? error.message : "Unknown error" } as any);
    } finally {
      setIsSearchLoading(false);
    }
  };

  useEffect(() => {
    performHealthCheck();
    loadTransactions();
  }, []);

  // primitives
  const Card = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <section className={`rounded-2xl border bg-white/80 dark:bg-slate-900/70 ring-1 ring-black/5 dark:ring-white/10 shadow-md ${className}`}>
      {children}
    </section>
  );

  const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
  );

  const Button = ({
    children,
    onClick,
    disabled,
    variant = "solid",
    size = "md",
    className = "",
    type = "button",
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: "solid" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
    className?: string;
    type?: "button" | "submit" | "reset";
  }) => {
    const sizeCls = size === "lg" ? "h-12 px-6" : size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4";
    const base = "inline-flex items-center justify-center rounded-xl font-medium transition focus:outline-none focus:ring-4 ring-indigo-500/20";
    const variants =
      variant === "outline"
        ? "border border-slate-300/70 dark:border-slate-700/70 bg-transparent hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
        : variant === "ghost"
        ? "hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
        : "bg-indigo-600 text-white hover:bg-indigo-600/90";
    return (
      <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizeCls} ${variants} disabled:opacity-60 ${className}`}>
        {children}
      </button>
    );
  };

  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-slate-300/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/60 px-3 text-sm outline-none focus:ring-4 ring-indigo-500/20 ${props.className ?? ""}`}
    />
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(60rem_60rem_at_90%_-10%,rgba(99,102,241,.2),transparent),radial-gradient(50rem_50rem_at_-10%_10%,rgba(16,185,129,.15),transparent)]">
      {/* Sticky top actions */}
      <div className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border-b border-black/5 dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">ZKSVM Rollup</div>
            <div className="text-base font-semibold">Management Dashboard</div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={performHealthCheck} disabled={isHealthLoading} size="sm">
              {isHealthLoading ? "Checking…" : "Health Check"}
            </Button>
            <Button onClick={() => loadTransactions(currentPage)} disabled={isTransactionsLoading} variant="outline" size="sm">
              View Transactions
            </Button>
          </div>
        </div>
      </div>

      {/* Page container */}
      <div className="mx-auto max-w-7xl px-4 py-10 space-y-10">
        {/* Hero */}
        <header className="text-center space-y-3">
          <p className="text-sm text-slate-500">
            Monitor, create, and analyze rollup transactions.{" "}
            <span className="font-semibold text-indigo-600">Batch 3 tx to settle on L1 instantly.</span>
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <div className="p-5 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500">Network Status</div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${
                      healthStatus?.status.includes("Error") ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                  />
                  <span className="text-xl font-semibold">
                    {healthStatus?.status.includes("Error") ? "Offline" : "Online"}
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-indigo-100 text-indigo-700 p-2 dark:bg-indigo-900/30 dark:text-indigo-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500">Total Transactions</div>
                <div className="mt-2 text-xl font-semibold">{transactions.length}</div>
              </div>
              <div className="rounded-xl bg-indigo-100 text-indigo-700 p-2 dark:bg-indigo-900/30 dark:text-indigo-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586l5.707 5.707" />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500">Current Page</div>
                <div className="mt-2 text-xl font-semibold">{currentPage}</div>
              </div>
              <div className="rounded-xl bg-indigo-100 text-indigo-700 p-2 dark:bg-indigo-900/30 dark:text-indigo-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2h10v2m-12 2h14v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Create Transactions */}
        <section className="space-y-8">
          <SectionTitle
            title="Create Transactions"
            subtitle="Build single or batched transactions. Submitting 3 in batch will trigger immediate L1 settlement."
          />

          {/* Batch creator full width */}
          <Card>
            <div className="p-6">
              <BatchTransactionCreator
                onTransactionSubmitted={() => loadTransactions(currentPage)}
                walletConnected={walletConnected}
                walletAddress={walletAddress}
                senderName={senderName}
              />
            </div>
          </Card>

          {/* Two-column: Health + Single creator */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Card>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">System Health</h3>
                  <Button onClick={performHealthCheck} disabled={isHealthLoading}>
                    {isHealthLoading ? "Checking…" : "Run Health Check"}
                  </Button>
                </div>

                {healthStatus && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/50 p-4">
                    <code className="block text-xs font-mono break-all">{healthStatus.status}</code>
                    <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Last checked: {new Date(healthStatus.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <TransactionCreator
                  onTransactionSubmitted={() => loadTransactions(currentPage)}
                  walletConnected={walletConnected}
                  walletAddress={walletAddress}
                  senderName={senderName}
                  onWalletConnect={handleWalletConnect}
                />
              </div>
            </Card>
          </div>
        </section>

        {/* Search */}
        <section>
          <SectionTitle title="Transaction Search" subtitle="Find a transaction by its signature hash" />
          <Card>
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="Enter transaction signature hash…"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchTransaction()}
                  className="flex-1"
                />
                <Button onClick={searchTransaction} disabled={isSearchLoading || !transactionHash.trim()}>
                  {isSearchLoading ? "Searching…" : "Search"}
                </Button>
              </div>

              {searchResult && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/50 p-4">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(searchResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* List */}
        <section>
          <SectionTitle title="Recent Transactions" subtitle="Latest transactions processed by the rollup" />
          <Card>
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <Button onClick={() => loadTransactions(currentPage)} disabled={isTransactionsLoading} variant="outline">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => loadTransactions(Math.max(1, currentPage - 1))}
                    disabled={isTransactionsLoading || currentPage <= 1}
                    variant="outline"
                    size="sm"
                  >
                    ‹ Prev
                  </Button>
                  <div className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">Page {currentPage}</div>
                  <Button
                    onClick={() => loadTransactions(currentPage + 1)}
                    disabled={isTransactionsLoading || transactions.length < 10}
                    variant="outline"
                    size="sm"
                  >
                    Next ›
                  </Button>
                </div>
              </div>

              {isTransactionsLoading ? (
                <div className="py-12 flex items-center justify-center text-slate-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current mr-3" />
                  Loading transactions…
                </div>
              ) : transactions.length ? (
                <ul className="space-y-4">
                  {transactions.map((tx, i) => (
                    <li
                      key={`${tx.hash}-${i}`}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/50 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-mono text-xs sm:text-sm font-medium truncate max-w-[70%] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">
                          {tx.hash}
                        </div>
                        <div className="text-xs text-slate-500">#{i + 1}</div>
                      </div>
                      <pre className="text-[11px] sm:text-xs font-mono whitespace-pre-wrap break-all text-slate-600 dark:text-slate-300">
                        {JSON.stringify(tx.transaction, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-12 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                    <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586L18 8.414V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-sm text-slate-500">No transactions yet. Create one above, or refresh.</div>
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
