/**
 * Load Razorpay checkout script dynamically.
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Open Razorpay checkout modal.
 * @param {Object} orderData - { orderId, amount, currency }
 * @param {Function} onSuccess - callback on successful payment
 * @param {Function} onFailure - callback on failure
 */
export async function openRazorpayCheckout(orderData, onSuccess, onFailure) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    onFailure?.(new Error("Razorpay SDK failed to load"));
    return;
  }

  const options = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount: orderData.amount,
    currency: orderData.currency || "INR",
    name: "SplitRight",
    description: "Settlement Payment",
    order_id: orderData.orderId,
    handler: (response) => onSuccess?.(response),
    prefill: orderData.prefill || {},
    theme: { color: "#7c3aed" },
  };

  const rzp = new (window as any).Razorpay(options);
  rzp.on("payment.failed", (response) => onFailure?.(response.error));
  rzp.open();
}

/**
 * Generate UPI deep-link for GPay / PhonePe / Paytm.
 * This is a client-side only operation.
 */
export function generateUPIDeepLink({ payeeName, payeeVPA, amount, note }) {
  const params = new URLSearchParams({
    pa: payeeVPA,
    pn: payeeName,
    am: String(amount),
    cu: "INR",
    tn: note || "SplitRight Settlement",
  });
  return `upi://pay?${params.toString()}`;
}
