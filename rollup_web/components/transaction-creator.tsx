"use client";

import { useState } from "react";
import { submitTransaction } from "@/lib/api";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Commitment,
} from "@solana/web3.js";

// Phantom wallet interface
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: PublicKey }>;
      disconnect: () => Promise<void>;
      signTransaction: (transaction: Transaction) => Promise<Transaction>;
      publicKey?: PublicKey;
      isConnected?: boolean;
    };
  }
}

interface TransactionCreatorProps {
  onTransactionSubmitted: () => void;
  walletConnected: boolean;
  walletAddress: string;
  senderName: string;
  onWalletConnect: (connected: boolean, address: string, name: string) => void;
}

/* ---------- Tailwind-only primitives ---------- */
const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`rounded-2xl border ring-1 ring-black/5 dark:ring-white/10 bg-white/80 dark:bg-slate-900/70 shadow-md ${className}`}>
    {children}
  </section>
);

const CardHeader = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-6 pt-6 pb-3 ${className}`}>{children}</div>
);

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xl font-semibold flex items-center gap-3">{children}</h3>
);

const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{children}</p>
);

const CardContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-6 pb-6 space-y-4 ${className}`}>{children}</div>
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
  variant?: "solid" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit" | "reset";
}) => {
  const sizeCls = size === "lg" ? "h-12 px-6" : size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4";
  const base = "inline-flex items-center justify-center rounded-xl font-medium transition focus:outline-none focus:ring-4 ring-indigo-500/20 disabled:opacity-60";
  const variants =
    variant === "outline"
      ? "border border-slate-300/70 dark:border-slate-700/70 bg-transparent hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
      : "bg-indigo-600 text-white hover:bg-indigo-600/90";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizeCls} ${variants} ${className}`}>
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
/* --------------------------------------------- */

export function TransactionCreator({
  onTransactionSubmitted,
  walletConnected,
  walletAddress,
  senderName,
  onWalletConnect,
}: TransactionCreatorProps) {
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<Record<string, unknown> | null>(null);

  const connectWallet = async () => {
    try {
      if (!window.solana || !window.solana.isPhantom) {
        alert("Please install Phantom wallet");
        return;
      }
      const resp = await window.solana.connect();
      onWalletConnect(true, resp.publicKey.toString(), "Phantom User");
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect to Phantom wallet");
    }
  };

  const disconnectWallet = async () => {
    try {
      if (window.solana) {
        await window.solana.disconnect();
      }
      onWalletConnect(false, "", "");
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  const handleSubmit = async () => {
    if (!walletConnected) {
      alert("Please connect your Phantom wallet first");
      return;
    }

    if (!senderName.trim() || !recipientAddress.trim() || !amount.trim()) {
      alert("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      // 1) Connect to devnet
      const commitment: Commitment = "confirmed";
      const connection = new Connection("https://api.devnet.solana.com", commitment);

      if (!window.solana?.publicKey) {
        throw new Error("Phantom wallet not connected");
      }

      // 2) Validate/parse recipient
      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(recipientAddress.trim());
      } catch {
        throw new Error("Invalid recipient address (must be a valid Solana public key)");
      }

      // 3) Parse lamports (integer)
      const lamports = Number.parseInt(amount.trim(), 10);
      if (!Number.isFinite(lamports) || lamports <= 0) {
        throw new Error("Amount must be a positive integer (lamports)");
      }

      // 4) Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");

      // 5) Build transfer tx
      const ix = SystemProgram.transfer({
        fromPubkey: window.solana.publicKey,
        toPubkey: recipientPubkey,
        lamports,
      });

      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = window.solana.publicKey;
      tx.add(ix);

      // 6) Sign with Phantom
      const signedTx = await window.solana.signTransaction(tx);

      // 7) Submit to your rollup API (let the API helper serialize → base64)
      //    Your submitTransaction() should accept Transaction | VersionedTransaction | string
      const result = await submitTransaction(senderName, signedTx);

      setSubmitResult({
        ...result,
        lastValidBlockHeight,
      });
      onTransactionSubmitted();

      // Reset inputs (keep wallet)
      setRecipientAddress("");
      setAmount("");
    } catch (error) {
      console.error("Transaction error:", error);
      setSubmitResult({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </span>
          Create Transaction
        </CardTitle>
        <CardDescription>Connect your wallet and submit new transactions to the ZKSVM rollup</CardDescription>
      </CardHeader>

      <CardContent>
        {!walletConnected ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-3">Connect your Phantom wallet to create real transactions</p>
              <Button onClick={connectWallet} className="w-full">Connect Phantom Wallet</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-md border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 p-3">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">✅ Wallet Connected</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-300 mt-1 break-all">{walletAddress}</p>
              <Button onClick={disconnectWallet} variant="outline" size="sm" className="mt-2">Disconnect</Button>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Sender Name</label>
              <Input
                placeholder="Connected wallet user"
                value={senderName}
                readOnly
                className="cursor-not-allowed"
              />
            </div>
          </>
        )}

        <div>
          <label className="text-sm font-medium mb-2 block">Recipient Address (Solana Pubkey)</label>
          <Input
            placeholder="e.g. 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">Must be a valid base58 Solana public key.</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Amount (lamports)</label>
          <Input
            type="number"
            placeholder="e.g. 1000000 (= 0.001 SOL)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={1}
            inputMode="numeric"
          />
          <p className="text-xs text-slate-500 mt-1">1 SOL = 1,000,000,000 lamports</p>
        </div>

        {walletConnected && (
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full flex items-center gap-2">
            {isSubmitting ? "Submitting..." : "Submit Transaction"}
          </Button>
        )}

        {submitResult && (
          <div className="mt-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
            <h4 className="font-medium mb-2">Result</h4>
            <pre className="text-xs whitespace-pre-wrap break-all text-slate-800 dark:text-slate-200">
              {JSON.stringify(submitResult, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
