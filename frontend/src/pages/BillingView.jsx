import React, { useState, useEffect } from 'react';
import { CreditCard, Check, Sparkles, Shield, Zap, ExternalLink, Loader2 } from 'lucide-react';
import { billingApi } from '../services/api';

export const BillingView = () => {
  const [subData, setSubData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  const fetchBilling = async () => {
    try {
      const res = await billingApi.getSubscription();
      setSubData(res.data);
      setPlans(res.data.plans || []);
    } catch (err) {
      console.error('Failed to load billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const handleSubscribe = async (planId) => {
    setCheckoutLoading(planId);
    try {
      const res = await billingApi.checkout(planId);
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to initiate Stripe checkout');
      setCheckoutLoading(null);
    }
  };

  const handleSimulate = async (planId) => {
    setCheckoutLoading(planId);
    try {
      await billingApi.simulateActivate(planId);
      await fetchBilling();
    } catch (err) {
      alert('Error updating plan');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const currentPlanId = subData?.plan_id || 'starter';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <span>Billing & Cloud Subscriptions</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold uppercase">
            {currentPlanId} Plan
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Automated Stripe billing and resource tiers for your Proxmox VPC cloud platform.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {plans.map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          return (
            <div
              key={plan.id}
              className={`p-6 rounded-2xl border flex flex-col justify-between transition-all ${
                isCurrent
                  ? 'bg-slate-900 border-sky-500 shadow-xl shadow-sky-500/10 ring-1 ring-sky-500/30'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base text-slate-100">{plan.name}</h3>
                  {isCurrent && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold">
                      CURRENT PLAN
                    </span>
                  )}
                </div>

                <div className="flex items-baseline space-x-1 mb-6">
                  <span className="text-3xl font-extrabold text-white">${plan.price_monthly}</span>
                  <span className="text-xs text-slate-400 font-medium">/ month</span>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-800 mb-6 text-xs text-slate-300">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-800/80">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold cursor-default"
                  >
                    Active Plan
                  </button>
                ) : (
                  <button
                    disabled={checkoutLoading === plan.id}
                    onClick={() => handleSubscribe(plan.id)}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50"
                  >
                    {checkoutLoading === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    <span>Subscribe via Stripe</span>
                  </button>
                )}

                {/* Dev Quick Switch (only when the backend sets BILLING_SIMULATOR_ENABLED) */}
                {subData?.billing_simulator_enabled && (
                  <button
                    onClick={() => handleSimulate(plan.id)}
                    className="w-full py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    ⚡ Simulate Upgrade (Dev Mode)
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
