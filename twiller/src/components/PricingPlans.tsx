"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Crown, Check, Sparkles, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import axiosInstance from "@/lib/axiosInstance";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "react-i18next";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailedResponse {
  error?: { description?: string };
}

interface RazorpayInstance {
  on: (event: "payment.failed", callback: (response: RazorpayFailedResponse) => void) => void;
  open: () => void;
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
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslation();
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <Crown className="h-12 w-12 text-yellow-400" />
        <h1 className="text-2xl font-bold text-white">{t("pricing.logInToUpgrade")}</h1>
        <p className="max-w-sm text-gray-400">
          {t("pricing.logInToUpgradeDesc")}
        </p>
        <Button
          className="rounded-full bg-blue-500 px-8 py-3 font-semibold text-white transition-all hover:bg-blue-600 active:scale-[0.98]"
          onClick={() => router.push("/")}
        >
          {t("pricing.logInSignUp")}
        </Button>
      </div>
    );
  }

  const openCheckout = async (plan: Plan) => {
    setProcessing(plan.id);
    setError(null);
    try {
      const res = await axiosInstance.post("/payment/create-order", {
        plan: plan.id,
      });
      const { orderId, amount, currency, keyId } = res.data;

      const options = {
        key: keyId,
        amount,
        currency,
        name: "Twiller",
        description: `${t(`pricing.plans.${plan.id}.name`)} - ${t(
          `pricing.plans.${plan.id}.limit`
        )}`,
        order_id: orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            const verifyRes = await axiosInstance.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            const updatedUser = verifyRes.data;
            setUser(updatedUser);
            localStorage.setItem("twitter-user", JSON.stringify(updatedUser));
            setError(null);
            toast(
              t("pricing.nowOnPlan", {
                name: t(`pricing.plans.${plan.id}.name`),
              }),
              "success"
            );
          } catch (verifyErr: unknown) {
            console.error("Payment verification failed:", verifyErr);
            const msg =
              verifyErr instanceof AxiosError &&
              verifyErr.response?.data?.error
                ? verifyErr.response.data.error
                : t("pricing.paymentVerificationFailed");
            setError(msg);
            toast(msg, "error");
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
      rzp.on("payment.failed", (response: RazorpayFailedResponse) => {
        const msg =
          response.error?.description || t("pricing.paymentFailed");
        setError(msg);
        toast(msg, "error");
        setProcessing(null);
      });
      rzp.open();
    } catch (err: unknown) {
      console.error("Create order failed:", err);
      const msg =
        err instanceof AxiosError && err.response?.data?.error
          ? err.response.data.error
          : t("pricing.startFailed");
      setError(msg);
      toast(msg, "error");
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-black/90 backdrop-blur-md">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-2 transition-colors hover:bg-gray-900"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">{t("pricing.title")}</h1>
            <p className="text-sm text-gray-400">
              {t("pricing.paymentWindow")}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="m-4 rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = user.plan === plan.id;
          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden rounded-2xl text-white transition-all duration-200 hover:-translate-y-1 ${
                plan.highlight
                  ? "border-blue-500 bg-gradient-to-b from-blue-500/10 to-transparent ring-1 ring-blue-500/50"
                  : "border-gray-800 bg-gray-900/60 hover:border-gray-700"
              }`}
            >
              {plan.highlight && (
                <div className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-2xl bg-blue-500 px-3 py-1 text-xs font-bold text-white">
                  <Sparkles className="h-3 w-3" />
                  {t("pricing.mostPopular")}
                </div>
              )}
              <CardContent className="p-6">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {plan.highlight ? (
                      <Crown className="h-5 w-5 text-yellow-400" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-gray-600" />
                    )}
                    <h3 className="text-lg font-bold">
                      {t(`pricing.plans.${plan.id}.name`)}
                    </h3>
                  </div>
                  {isCurrent && (
                    <span className="rounded-full border border-blue-500/40 bg-blue-500/20 px-3 py-1 text-xs text-blue-400">
                      {t("pricing.current")}
                    </span>
                  )}
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold">
                    {plan.price === 0
                      ? t("pricing.plans.free.name")
                      : `₹${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-400">{t("pricing.perMonth")}</span>
                  )}
                </div>
                <p className="mb-4 text-sm font-semibold text-blue-400">
                  {t(`pricing.plans.${plan.id}.limit`)}
                </p>
                <ul className="mb-6 space-y-2">
                  {(
                    t(`pricing.plans.${plan.id}.features`, {
                      returnObjects: true,
                    }) as string[]
                  ).map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-gray-300"
                    >
                      <Check className="h-4 w-4 shrink-0 text-blue-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full rounded-full font-semibold transition-all active:scale-[0.98] ${
                    isCurrent
                      ? "border-gray-600 bg-transparent text-gray-400"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                  variant="outline"
                  disabled={
                    plan.price === 0 || isCurrent || processing !== null
                  }
                  onClick={() => openCheckout(plan)}
                >
                  {processing === plan.id ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : isCurrent ? (
                    t("pricing.currentPlan")
                  ) : (
                    t("pricing.upgrade")
                  )}
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
