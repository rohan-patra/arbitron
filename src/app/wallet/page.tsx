"use client";

import { useEffect, useState } from "react";
import type { UserData } from "~/types/strategy";

export default function WalletPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);

  useEffect(() => {
    fetch("/api/user")
      .then((res) => res.json())
      .then((data: UserData) => {
        setUserData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const isValidSepoliaAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const handleWithdraw = async () => {
    if (!userData || !withdrawAddress || !withdrawAmount) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (amount > userData.wallet.usdcBalance) {
      alert("Insufficient balance");
      return;
    }

    if (!isValidSepoliaAddress(withdrawAddress)) {
      alert("Please enter a valid Ethereum address");
      return;
    }

    setIsWithdrawing(true);
    try {
      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: withdrawAddress,
          amount,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setUserData((prev) =>
          prev ? { ...prev, wallet: { usdcBalance: result.newBalance } } : null,
        );
        setWithdrawAddress("");
        setWithdrawAmount("");
        alert(`Successfully withdrew ${amount} USDC to ${withdrawAddress}`);
      } else {
        const error = await response.json();
        alert(error.error ?? "Failed to withdraw funds");
      }
    } catch {
      alert("Failed to withdraw funds");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleDeposit = async () => {
    if (!userData || !depositAmount) return;

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsDepositing(true);
    try {
      const response = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (response.ok) {
        const result = await response.json();
        setUserData((prev) =>
          prev ? { ...prev, wallet: { usdcBalance: result.newBalance } } : null,
        );
        setDepositAmount("");
        alert(`Successfully deposited ${amount} USDC to your wallet`);
      } else {
        const error = await response.json();
        alert(error.error ?? "Failed to deposit funds");
      }
    } catch {
      alert("Failed to deposit funds");
    } finally {
      setIsDepositing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-white">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading wallet...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold">Wallet</h1>
        <p className="text-gray-600">
          Manage your USDC balance and transactions
        </p>
      </div>

      {/* Balance Card */}
      <div className="mb-8 rounded border p-6">
        <div className="text-center">
          <div className="mb-2 text-4xl font-bold">
            ${userData?.wallet?.usdcBalance?.toLocaleString() ?? 0} USDC
          </div>
          <div className="text-gray-600">Available Balance</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Deposit Section */}
        <div className="rounded border p-6">
          <h2 className="mb-4 text-xl font-semibold">Deposit Funds</h2>
          <p className="mb-6 text-sm text-gray-600">
            Add USDC to your wallet to fund trading strategies
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Amount (USDC)
              </label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Enter amount to deposit..."
                className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
                min="0"
                step="0.01"
              />
            </div>

            <button
              onClick={handleDeposit}
              disabled={!depositAmount || isDepositing}
              className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDepositing ? "Processing..." : "Deposit USDC"}
            </button>
          </div>
        </div>

        {/* Withdraw Section */}
        <div className="rounded border p-6">
          <h2 className="mb-4 text-xl font-semibold">Withdraw Funds</h2>
          <p className="mb-6 text-sm text-gray-600">
            Withdraw USDC from your wallet to a Polygon Sepolia address
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Polygon Sepolia Address
              </label>
              <input
                type="text"
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                placeholder="0x..."
                className="w-full rounded border px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Amount (USDC)
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount to withdraw..."
                className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
                min="0"
                step="0.01"
                max={userData?.wallet?.usdcBalance ?? 0}
              />
            </div>

            <button
              onClick={handleWithdraw}
              disabled={!withdrawAddress || !withdrawAmount || isWithdrawing}
              className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isWithdrawing ? "Processing..." : "Withdraw USDC"}
            </button>
          </div>

          <div className="mt-4 rounded border p-3 text-sm text-gray-600">
            <strong>Note:</strong> Ensure your address is correct. Transactions
            to wrong addresses cannot be reversed.
          </div>
        </div>
      </div>
    </div>
  );
}
