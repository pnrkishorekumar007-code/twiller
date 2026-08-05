// Sends the post-payment emails (invoice + subscription details) without
// letting a slow or failing SMTP/HTTP transport fail the payment response.
import { sendInvoiceEmail, sendSubscriptionDetailsEmail } from "./mailer.js";

export async function sendPaymentEmails({ invoice, subscription }) {
  const results = await Promise.allSettled([
    sendInvoiceEmail(invoice),
    sendSubscriptionDetailsEmail(subscription),
  ]);
  return results.map((r) => r.status === "fulfilled");
}
