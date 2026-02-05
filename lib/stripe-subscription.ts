import Stripe from "stripe";

/**
 * Get the product name of the customer's active Stripe subscription.
 * Returns null if no active subscription or on error.
 */
export async function getActiveSubscriptionProductName(
  stripe: Stripe,
  stripeCustomerId: string
): Promise<string | null> {
  try {
    const [activeSubs, trialingSubs] = await Promise.all([
      stripe.subscriptions.list({ customer: stripeCustomerId, status: "active", limit: 1, expand: ["data.items.data.price"] }),
      stripe.subscriptions.list({ customer: stripeCustomerId, status: "trialing", limit: 1, expand: ["data.items.data.price"] }),
    ]);
    const subs = activeSubs.data.length > 0 ? activeSubs : trialingSubs;
    const sub = subs.data[0];
    const item = sub?.items?.data?.[0];
    if (!item?.price) return null;
    const price = item.price as Stripe.Price;
    const productId = typeof price.product === "string" ? price.product : (price.product as Stripe.Product)?.id;
    if (!productId) return null;
    const product = await stripe.products.retrieve(productId);
    return product.name ?? null;
  } catch {
    return null;
  }
}
