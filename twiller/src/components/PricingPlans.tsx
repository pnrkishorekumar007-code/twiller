"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Crown, Check } from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Plan {
  id: string;
  name: string;
  price: number;
  limit: string;
  features: string[];
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    limit: "1 tweet per month",
    features: ["1 tweet per month", "Basic profile", "Community support"],
  },
  {
    id: "bronze",
    name: "Bronze",
    price: 100,
    limit: "3 tweets per month",
    features: ["3 tweets per month", "Priority profile badge", "Email support"],
  },
  {
    id: "silver",
    name: "Silver",
    price: 300,
    limit: "5 tweets per month",
    features: ["5 tweets per month", "Everything in Bronze", "Analytics preview"],
  },
  {
    id: "gold",
    name: "Gold",
    price: 1000,
    limit: "Unlimited tweets",
    features: ["Unlimited tweets", "Everything in Silver", "Early access features"],
    highlight: true,
  },
];

const PricingPlans = () => {
  const { user, setUser } = useAuth();
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const openCheckout = async (plan: Plan) => {
    setProcessing(plan.id);
    setError(null);
    try {
      const res = await axiosInstance.post("/payment/create-order", {
        userId: user._id,
        plan: plan.id,
      });
      const { orderId, amount, currency, keyId } = res.data;

      const options = {
        key: keyId,
        amount,
        currency,
        name: "Twiller",
        description: `${plan.name} Plan - ${plan.limit}`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await axiosInstance.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user._id,
              plan: plan.id,
            });
            const updatedUser = verifyRes.data;
            setUser(updatedUser);
            localStorage.setItem("twitter-user", JSON.stringify(updatedUser));
            setError(null);
          } catch (verifyErr: any) {
            console.error("Payment verification failed:", verifyErr);
            setError(
              verifyErr.response?.data?.error ||
                "Payment verification failed. Please contact support."
            );
          }
        },
        modal: {
          ondismiss: () => setProcessing(null),
        },
        theme: {
          color: "#1d9bf0",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setError(
          response.error?.description || "Payment failed. Please try again."
        );
        setProcessing(null);
      });
      rzp.open();
    } catch (err: any) {
      console.error("Create order failed:", err);
      setError(
        err.response?.data?.error ||
          "Failed to start payment. Please try again."
      );
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-white">Upgrade your plan</h1>
          <p className="text-gray-400 text-sm">
            Unlock more tweets every month. Payments are accepted between 10:00
            AM and 11:00 AM IST.
          </p>
        </div>
      </div>

      {error && (
        <div className="m-4 bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
        {PLANS.map((plan) => {
          const isCurrent = user.plan === plan.id;
          return (
            <Card
              key={plan.id}
              className={`bg-black border ${
                plan.highlight
                  ? "border-blue-500"
                  : "border-gray-800"
              } text-white`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {plan.highlight && (
                      <Crown className="h-5 w-5 text-blue-400" />
                    )}
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                  </div>
                  {isCurrent && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-full px-3 py-1">
                      Current
                    </span>
                  )}
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold">
                    {plan.price === 0 ? "Free" : `₹${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-400">/month</span>
                  )}
                </div>
                <p className="text-blue-400 text-sm font-semibold mb-4">
                  {plan.limit}
                </p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-gray-300 text-sm"
                    >
                      <Check className="h-4 w-4 text-blue-400 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full"
                  disabled={
                    plan.price === 0 ||
                    isCurrent ||
                    processing === plan.id
                  }
                  onClick={() => openCheckout(plan)}
                >
                  {processing === plan.id ? "Processing..." : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PricingPlans;
