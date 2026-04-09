import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../utils/api";

export default function Payment() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const [method, setMethod] = useState("momo");
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastPayment, setLastPayment] = useState(null);

  const targetId = searchParams.get("providerId") || searchParams.get("clientId");
  const targetType = searchParams.get("providerId") ? "provider" : "client";
  const amount = targetType === "provider" ? 1000 : 1500;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [infoRes, paymentsRes] = await Promise.all([
        api.get("/payments/info"),
        api.get("/payments/my"),
      ]);
      setPaymentInfo(infoRes.data);
      setPayments(paymentsRes.data);
    } catch {
      addToast("Failed to load payment data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (method === "momo" && !phone.trim()) {
      return addToast("Enter your Mobile Money phone number", "warning");
    }
    setPaying(true);
    try {
      const endpoint = targetType === "provider" ? "/payments/client-pay" : "/payments/provider-pay";
      const body = targetType === "provider"
        ? { providerId: parseInt(targetId), method, phone: method === "momo" ? phone : undefined }
        : { clientId: parseInt(targetId), method, phone: method === "momo" ? phone : undefined };

      const res = await api.post(endpoint, body);
      setLastPayment(res.data.payment);
      setShowSuccess(true);
      addToast(res.data.message, "success");
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.error || "Payment failed", "error");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <i className="fas fa-spinner fa-spin text-3xl text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          <i className="fas fa-credit-card text-primary-500 mr-2" />
          Payments
        </h1>
        <p className="text-gray-500 mb-8">
          {user?.role === "client"
            ? "Pay 1,000 RWF to contact a service provider"
            : "Pay 1,500 RWF per client to access their details"}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Form */}
          {targetId && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Make Payment
              </h2>

              <div className="bg-primary-50 rounded-xl p-4 mb-6">
                <div className="text-center">
                  <p className="text-sm text-primary-600 font-medium">Amount to Pay</p>
                  <p className="text-3xl font-bold text-primary-700">{amount.toLocaleString()} RWF</p>
                  <p className="text-xs text-primary-500 mt-1">
                    {targetType === "provider" ? "To contact this provider" : "To access this client"}
                  </p>
                </div>
              </div>

              {/* Method Selection */}
              <div className="space-y-3 mb-6">
                <label className="text-sm font-semibold text-gray-700">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod("momo")}
                    className={`p-4 rounded-xl border-2 transition text-center ${
                      method === "momo"
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <i className="fas fa-mobile-alt text-2xl mb-2 text-yellow-500" />
                    <p className="font-semibold text-gray-800 text-sm">Mobile Money</p>
                    <p className="text-xs text-gray-500">Instant update</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("bank")}
                    className={`p-4 rounded-xl border-2 transition text-center ${
                      method === "bank"
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <i className="fas fa-university text-2xl mb-2 text-blue-500" />
                    <p className="font-semibold text-gray-800 text-sm">Bank Transfer</p>
                    <p className="text-xs text-gray-500">Equity Bank</p>
                  </button>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                {method === "momo" ? (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Send to Mobile Money</p>
                    <p className="text-lg font-bold text-gray-900">
                      <i className="fas fa-phone text-green-500 mr-2" />
                      {paymentInfo?.momo?.number || "0784010076"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Send exactly {amount.toLocaleString()} RWF then submit below</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Bank Transfer Details</p>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Bank:</span> Equity Bank
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Account:</span>{" "}
                        <span className="font-bold text-gray-900">{paymentInfo?.bank?.account || "4007101374592"}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Transfer exactly {amount.toLocaleString()} RWF then submit below</p>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handlePay} className="space-y-4">
                {method === "momo" && (
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">
                      Your MoMo Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07XXXXXXXX"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={paying}
                  className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-50 text-sm"
                >
                  {paying ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane mr-2" />
                      Submit Payment ({amount.toLocaleString()} RWF)
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Payment History */}
          <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${!targetId ? "lg:col-span-2" : ""}`}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              <i className="fas fa-history text-gray-400 mr-2" />
              Payment History
            </h2>
            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        p.status === "confirmed" ? "bg-green-100" : p.status === "pending" ? "bg-yellow-100" : "bg-red-100"
                      }`}>
                        <i className={`fas ${
                          p.status === "confirmed" ? "fa-check text-green-600" :
                          p.status === "pending" ? "fa-clock text-yellow-600" : "fa-times text-red-600"
                        }`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{p.amount?.toLocaleString()} RWF</p>
                        <p className="text-xs text-gray-500">
                          To: {p.targetName} &middot; {p.method === "momo" ? "Mobile Money" : "Bank"} &middot; {p.reference}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        p.status === "confirmed" ? "bg-green-50 text-green-600" :
                        p.status === "pending" ? "bg-yellow-50 text-yellow-600" : "bg-red-50 text-red-600"
                      }`}>
                        {p.status}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <i className="fas fa-receipt text-4xl mb-3 block" />
                <p>No payments yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Success Modal */}
        <AnimatePresence>
          {showSuccess && lastPayment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowSuccess(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-8 max-w-sm w-full text-center"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-check text-green-600 text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Submitted!</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Your payment of <span className="font-bold">{lastPayment.amount?.toLocaleString()} RWF</span> has been
                  submitted. The admin will confirm it shortly.
                </p>
                <p className="text-xs text-gray-400 mb-6">Reference: {lastPayment.reference}</p>
                <button
                  onClick={() => setShowSuccess(false)}
                  className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition w-full"
                >
                  OK
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
