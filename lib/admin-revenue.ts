import Stripe from "stripe";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/** Use local timezone (matches debug route) for month boundaries. */
function getMonthBounds(monthOffset: number): { start: number; end: number } {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + monthOffset;
  const start = Math.floor(new Date(y, m, 1).getTime() / 1000);
  const end = Math.floor(new Date(y, m + 1, 0, 23, 59, 59).getTime() / 1000);
  return { start, end };
}

function getMonthName(monthOffset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset);
  return d.toLocaleString("en-US", { month: "long", timeZone: "America/New_York" });
}

export type AdminRevenueData = {
  lastMonthRevenue: number;
  lastMonthName: string;
  thisMonthRevenue: number;
  thisMonthName: string;
  nextMonthForecast: number;
  nextMonthName: string;
};

export type RevenueTransaction = {
  customerName: string;
  date: string; // YYYY-MM-DD for sorting
  dateTimestamp: number; // Unix seconds - format on client in local timezone for correct display
  amount: number;
  type: "subscription" | "invoice"; // subscription = recurring, invoice = one-off
};

export type MonthKey = "last" | "this" | "next";

export async function computeRevenueTransactions(
  month: MonthKey
): Promise<RevenueTransaction[]> {
  const stripe = getStripe();
  const transactions: RevenueTransaction[] = [];

  const monthOffset = month === "last" ? -1 : month === "this" ? 0 : 1;
  const bounds = getMonthBounds(monthOffset);

  if (!stripe) return transactions;

  if (month === "last" || month === "this") {
    // Balance transactions (charge, payment) - matches primary revenue source
    const incomeTypes = ["charge", "payment"] as const;
    for (const txType of incomeTypes) {
      let hasMore = true;
      let startingAfter: string | undefined;
      while (hasMore) {
        const list = await stripe.balanceTransactions.list({
          type: txType,
          created: { gte: bounds.start, lte: bounds.end },
          limit: 100,
          expand: ["data.source", "data.source.invoice"],
          ...(startingAfter && { starting_after: startingAfter }),
        });
        for (const tx of list.data) {
          const amount = (tx.amount ?? 0) / 100;
          if (amount <= 0) continue;
          const dateStr = new Date((tx.created ?? 0) * 1000).toISOString().split("T")[0];
          const source = tx.source;
          let customerName = "—";
          let isSubscription = false;
          if (source && typeof source === "object" && !("deleted" in source)) {
            const src = source as Stripe.Charge | Stripe.PaymentIntent;
            const cust = "customer" in src ? src.customer : null;
            if (cust && typeof cust === "object" && cust && !("deleted" in cust)) {
              customerName =
                (cust as Stripe.Customer).name ?? (cust as Stripe.Customer).email ?? "—";
            } else if (typeof cust === "string") {
              try {
                const c = await stripe.customers.retrieve(cust);
                if (c && !("deleted" in c)) {
                  customerName = c.name ?? c.email ?? "—";
                }
              } catch {
                // ignore
              }
            }
            const inv = "invoice" in src ? src.invoice : null;
            if (inv && typeof inv === "object" && inv && !("deleted" in inv)) {
              isSubscription = !!(inv as Stripe.Invoice).subscription;
            }
          }
          const ts = tx.created ?? 0;
          transactions.push({
            customerName: String(customerName).trim() || "—",
            date: dateStr,
            dateTimestamp: ts,
            amount,
            type: isSubscription ? "subscription" : "invoice",
          });
        }
        hasMore = list.has_more;
        if (list.data.length > 0) startingAfter = list.data[list.data.length - 1].id;
        else hasMore = false;
      }
    }
  }

  if (month === "this" || month === "next") {
    // Draft/open invoices (expected/forecast)
    for (const invStatus of ["draft", "open"] as const) {
      let invHasMore = true;
      let invStartingAfter: string | undefined;
      while (invHasMore) {
        const invList = await stripe.invoices.list({
          status: invStatus,
          limit: 100,
          expand: ["data.customer"],
          ...(invStartingAfter && { starting_after: invStartingAfter }),
        });
        for (const inv of invList.data) {
          if (inv.subscription) continue; // Subscription invoices handled separately
          const dueTs = inv.due_date ?? inv.period_end ?? inv.created;
          if (dueTs == null) continue;
          const inRange = dueTs >= bounds.start && dueTs <= bounds.end;
          if (!inRange) continue;

          const amount = (inv.amount_due ?? inv.amount_remaining ?? 0) / 100;
          if (amount <= 0) continue;

          const customer = inv.customer;
          let customerName = "—";
          if (typeof customer === "object" && customer && !("deleted" in customer)) {
            customerName =
              (customer as Stripe.Customer).name ??
              (customer as Stripe.Customer).email ??
              "—";
          } else if (typeof customer === "string") {
            try {
              const c = await stripe.customers.retrieve(customer);
              if (c && !("deleted" in c)) {
                customerName = c.name ?? c.email ?? "—";
              }
            } catch {
              // ignore
            }
          }

          transactions.push({
            customerName: String(customerName).trim() || "—",
            date: new Date(dueTs * 1000).toISOString().split("T")[0],
            dateTimestamp: dueTs,
            amount,
            type: "invoice",
          });
        }
        invHasMore = invList.has_more;
        if (invList.data.length > 0) {
          invStartingAfter = invList.data[invList.data.length - 1].id;
        } else {
          invHasMore = false;
        }
      }
    }

    // Subscriptions with upcoming payments
    const subStatuses = ["active", "trialing", "past_due", "incomplete"] as const;
    for (const status of subStatuses) {
      let subHasMore = true;
      let subStartingAfter: string | undefined;
      while (subHasMore) {
        const subList = await stripe.subscriptions.list({
          status,
          limit: 100,
          expand: ["data.customer", "data.latest_invoice"],
          ...(subStartingAfter && { starting_after: subStartingAfter }),
        });
        for (const sub of subList.data) {
          const customerId =
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
          if (!customerId) continue;

          let amount = 0;
          let paymentTs: number | null = null;
          const latestInv = sub.latest_invoice;
          const invObj =
            typeof latestInv === "object" && latestInv && !("deleted" in latestInv)
              ? (latestInv as Stripe.Invoice)
              : null;
          const hasOpenOrDraft = invObj && (invObj.status === "open" || invObj.status === "draft");

          if (hasOpenOrDraft && invObj) {
            amount = (invObj.amount_due ?? invObj.amount_remaining ?? 0) / 100;
            paymentTs = invObj.due_date ?? invObj.period_end ?? sub.current_period_end ?? null;
          } else {
            try {
              const upcoming = await stripe.invoices.retrieveUpcoming({
                customer: customerId,
                subscription: sub.id,
              });
              amount = (upcoming.amount_due ?? upcoming.amount_remaining ?? 0) / 100;
              paymentTs =
                upcoming.due_date ?? upcoming.period_end ?? sub.current_period_end ?? null;
            } catch {
              paymentTs = sub.current_period_end ?? null;
              if (paymentTs) {
                for (const item of sub.items?.data ?? []) {
                  const price = item?.price;
                  const qty = item?.quantity ?? 1;
                  if (price && typeof price === "object" && price.unit_amount != null) {
                    amount += (price.unit_amount * qty) / 100;
                  }
                }
              }
            }
          }

          if (amount <= 0 || !paymentTs) continue;
          if (paymentTs < bounds.start || paymentTs > bounds.end) continue;

          let customerName = "—";
          const cust = sub.customer;
          if (typeof cust === "object" && cust && !("deleted" in cust)) {
            customerName = (cust as Stripe.Customer).name ?? (cust as Stripe.Customer).email ?? "—";
          } else if (typeof cust === "string") {
            try {
              const c = await stripe.customers.retrieve(cust);
              if (c && !("deleted" in c)) {
                customerName = c.name ?? c.email ?? "—";
              }
            } catch {
              // ignore
            }
          }

          transactions.push({
            customerName: String(customerName).trim() || "—",
            date: new Date(paymentTs * 1000).toISOString().split("T")[0],
            dateTimestamp: paymentTs,
            amount,
            type: "subscription",
          });
        }
        subHasMore = subList.has_more;
        if (subList.data.length > 0) {
          subStartingAfter = subList.data[subList.data.length - 1].id;
        } else {
          subHasMore = false;
        }
      }
    }
  }

  // Sort by date ascending
  transactions.sort((a, b) => a.date.localeCompare(b.date));
  return transactions;
}

export async function computeAdminRevenue(): Promise<AdminRevenueData> {
  const stripe = getStripe();
  let lastMonthRevenue = 0;
  let thisMonthReceived = 0;
  let thisMonthExpected = 0;
  let nextMonthForecast = 0;

  const lastMonth = getMonthBounds(-1);
  const thisMonth = getMonthBounds(0);
  const nextMonth = getMonthBounds(1);

  if (stripe) {
    const incomeTypes = ["charge", "payment"] as const;
    for (const txType of incomeTypes) {
      let hasMore = true;
      let startingAfter: string | undefined;
      while (hasMore) {
        const list = await stripe.balanceTransactions.list({
          type: txType,
          created: { gte: lastMonth.start, lte: lastMonth.end },
          limit: 100,
          ...(startingAfter && { starting_after: startingAfter }),
        });
        for (const tx of list.data) {
          lastMonthRevenue += (tx.amount ?? 0) / 100;
        }
        hasMore = list.has_more;
        if (list.data.length > 0) {
          startingAfter = list.data[list.data.length - 1].id;
        } else {
          hasMore = false;
        }
      }
    }

    if (lastMonthRevenue === 0) {
      let invHasMore = true;
      let invStart: string | undefined;
      const createdSince = lastMonth.start - 86400 * 60;
      while (invHasMore) {
        const invList = await stripe.invoices.list({
          status: "paid",
          limit: 100,
          created: { gte: createdSince },
          ...(invStart && { starting_after: invStart }),
        });
        for (const inv of invList.data) {
          const paidAt = inv.status_transitions?.paid_at ?? inv.created;
          if (paidAt >= lastMonth.start && paidAt <= lastMonth.end) {
            lastMonthRevenue += (inv.amount_paid ?? 0) / 100;
          }
        }
        invHasMore = invList.has_more;
        if (invList.data.length > 0) invStart = invList.data[invList.data.length - 1].id;
        else invHasMore = false;
      }
    }
  }

  if (stripe) {
    const incomeTypes = ["charge", "payment"] as const;
    for (const txType of incomeTypes) {
      let hasMore = true;
      let startingAfter: string | undefined;
      while (hasMore) {
        const list = await stripe.balanceTransactions.list({
          type: txType,
          created: { gte: thisMonth.start, lte: thisMonth.end },
          limit: 100,
          ...(startingAfter && { starting_after: startingAfter }),
        });
        for (const tx of list.data) {
          thisMonthReceived += (tx.amount ?? 0) / 100;
        }
        hasMore = list.has_more;
        if (list.data.length > 0) {
          startingAfter = list.data[list.data.length - 1].id;
        } else {
          hasMore = false;
        }
      }
    }

    if (thisMonthReceived === 0) {
      let invHasMore = true;
      let invStart: string | undefined;
      const createdSince = thisMonth.start - 86400 * 60;
      while (invHasMore) {
        const invList = await stripe.invoices.list({
          status: "paid",
          limit: 100,
          created: { gte: createdSince },
          ...(invStart && { starting_after: invStart }),
        });
        for (const inv of invList.data) {
          const paidAt = inv.status_transitions?.paid_at ?? inv.created;
          if (paidAt >= thisMonth.start && paidAt <= thisMonth.end) {
            thisMonthReceived += (inv.amount_paid ?? 0) / 100;
          }
        }
        invHasMore = invList.has_more;
        if (invList.data.length > 0) invStart = invList.data[invList.data.length - 1].id;
        else invHasMore = false;
      }
    }
  }

  if (stripe) {
    const subStatuses = ["active", "trialing", "past_due", "incomplete"] as const;
    for (const status of subStatuses) {
      let subHasMore = true;
      let subStartingAfter: string | undefined;
      while (subHasMore) {
        const subList = await stripe.subscriptions.list({
          status,
          limit: 100,
          expand: [
            "data.items.data.price",
            "data.discounts",
            "data.discounts.coupon",
            "data.latest_invoice",
          ],
          ...(subStartingAfter && { starting_after: subStartingAfter }),
        });
        for (const sub of subList.data) {
          const customerId =
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
          if (!customerId) continue;

          const latestInv = sub.latest_invoice;
          let invObj: Stripe.Invoice | null =
            typeof latestInv === "object" && latestInv && !("deleted" in latestInv)
              ? (latestInv as Stripe.Invoice)
              : null;
          if (!invObj && typeof latestInv === "string") {
            try {
              const fetched = await stripe.invoices.retrieve(latestInv);
              invObj = fetched;
            } catch {
              invObj = null;
            }
          }
          const hasOpenOrDraftInvoice =
            invObj && (invObj.status === "open" || invObj.status === "draft");

          function getRecurringAmount(): number {
            let amt = 0;
            for (const item of sub.items?.data ?? []) {
              const price = item?.price;
              const quantity = item?.quantity ?? 1;
              if (price && typeof price === "object" && price.unit_amount != null) {
                amt += (price.unit_amount * quantity) / 100;
              }
            }
            if (amt > 0) {
              const discounts = sub.discounts ?? (sub.discount ? [sub.discount] : []);
              for (const d of discounts) {
                const coupon = typeof d === "object" && d && "coupon" in d ? d.coupon : null;
                if (coupon && typeof coupon === "object") {
                  if (coupon.percent_off != null) {
                    amt = (amt * (100 - coupon.percent_off)) / 100;
                  } else if (coupon.amount_off != null) {
                    amt = Math.max(0, amt - coupon.amount_off / 100);
                  }
                }
              }
            }
            return amt;
          }

          if (hasOpenOrDraftInvoice && invObj) {
            const invAmount = (invObj.amount_due ?? invObj.amount_remaining ?? 0) / 100;
            const invDueTs =
              invObj.due_date ??
              invObj.period_end ??
              sub.current_period_end ??
              null;
            if (invAmount > 0 && invDueTs) {
              const inThis = invDueTs >= thisMonth.start && invDueTs <= thisMonth.end;
              const inNext = invDueTs >= nextMonth.start && invDueTs <= nextMonth.end;
              if (inThis) thisMonthExpected += invAmount;
              if (inNext) nextMonthForecast += invAmount;
            }
            if (sub.current_period_end) {
              const periodStart = sub.current_period_start ?? sub.current_period_end;
              const periodLen = sub.current_period_end && periodStart
                ? sub.current_period_end - periodStart
                : 30 * 86400;
              const nextPeriodEnd = sub.current_period_end + periodLen;
              const amount = getRecurringAmount();
              if (amount > 0) {
                let daysUntilDue = 30 * 86400;
                if (invObj.due_date && invObj.period_end) {
                  daysUntilDue = Math.max(0, invObj.due_date - invObj.period_end);
                }
                const nextDueEstimate = nextPeriodEnd + daysUntilDue;
                const inThis = nextDueEstimate >= thisMonth.start && nextDueEstimate <= thisMonth.end;
                const inNext = nextDueEstimate >= nextMonth.start && nextDueEstimate <= nextMonth.end;
                if (inThis) thisMonthExpected += amount;
                if (inNext) nextMonthForecast += amount;
              }
            }
            continue;
          }

          let amount = 0;
          let paymentTs: number | null = null;
          try {
            const upcoming = await stripe.invoices.retrieveUpcoming({
              customer: customerId,
              subscription: sub.id,
            });
            if (upcoming) {
              amount = (upcoming.amount_due ?? upcoming.amount_remaining ?? 0) / 100;
              paymentTs =
                upcoming.due_date ??
                upcoming.period_end ??
                sub.current_period_end ??
                null;
            }
          } catch {
            paymentTs =
              (status === "trialing" && sub.trial_end ? sub.trial_end : null) ??
              sub.current_period_end ??
              null;
            amount = getRecurringAmount();
          }
          if (amount <= 0) continue;
          if (!paymentTs) continue;

          const inThisMonth =
            paymentTs >= thisMonth.start && paymentTs <= thisMonth.end;
          const inNextMonth =
            paymentTs >= nextMonth.start && paymentTs <= nextMonth.end;
          if (inThisMonth) thisMonthExpected += amount;
          if (inNextMonth) nextMonthForecast += amount;
        }
        subHasMore = subList.has_more;
        if (subList.data.length > 0) {
          subStartingAfter = subList.data[subList.data.length - 1].id;
        } else {
          subHasMore = false;
        }
      }
    }

    let schedHasMore = true;
    let schedStartingAfter: string | undefined;
    while (schedHasMore) {
      const schedList = await stripe.subscriptionSchedules.list({
        limit: 100,
        ...(schedStartingAfter && { starting_after: schedStartingAfter }),
      });
      for (const sched of schedList.data) {
        if (sched.status !== "not_started") continue;
        const phase = sched.phases?.[0];
        if (!phase?.start_date) continue;
        const startTs = phase.start_date;
        const inThisMonth = startTs >= thisMonth.start && startTs <= thisMonth.end;
        const inNextMonth = startTs >= nextMonth.start && startTs <= nextMonth.end;
        if (!inThisMonth && !inNextMonth) continue;

        let phaseAmount = 0;
        const items = phase.items ?? [];
        for (const pi of items) {
          try {
            const price =
              typeof pi.price === "string"
                ? await stripe.prices.retrieve(pi.price)
                : pi.price;
            phaseAmount +=
              price && typeof price === "object" && !("deleted" in price) && "unit_amount" in price && price.unit_amount != null
                ? (price.unit_amount * (pi.quantity ?? 1)) / 100
                : 0;
          } catch {
            //
          }
        }
        if (inThisMonth) thisMonthExpected += phaseAmount;
        if (inNextMonth) nextMonthForecast += phaseAmount;
      }
      schedHasMore = schedList.has_more;
      if (schedList.data.length > 0) {
        schedStartingAfter = schedList.data[schedList.data.length - 1].id;
      } else {
        schedHasMore = false;
      }
    }

    const invStatuses = ["draft", "open"] as const;
    for (const invStatus of invStatuses) {
      let invHasMore = true;
      let invStartingAfter: string | undefined;
      while (invHasMore) {
        const invList = await stripe.invoices.list({
          status: invStatus,
          limit: 100,
          ...(invStartingAfter && { starting_after: invStartingAfter }),
        });
        for (const inv of invList.data) {
          if (inv.subscription) continue;
          const dueTs = inv.due_date ?? inv.period_end ?? inv.created;
          if (dueTs == null) continue;
          const inThisMonth = dueTs >= thisMonth.start && dueTs <= thisMonth.end;
          const inNextMonth = dueTs >= nextMonth.start && dueTs <= nextMonth.end;
          if (!inThisMonth && !inNextMonth) continue;

          const amount = (inv.amount_due ?? inv.amount_remaining ?? 0) / 100;
          if (amount <= 0) continue;
          if (inThisMonth) thisMonthExpected += amount;
          if (inNextMonth) nextMonthForecast += amount;
        }
        invHasMore = invList.has_more;
        if (invList.data.length > 0) {
          invStartingAfter = invList.data[invList.data.length - 1].id;
        } else {
          invHasMore = false;
        }
      }
    }
  }

  const thisMonthRevenue = thisMonthReceived + thisMonthExpected;

  return {
    lastMonthRevenue,
    lastMonthName: getMonthName(-1),
    thisMonthRevenue,
    thisMonthName: getMonthName(0),
    nextMonthForecast,
    nextMonthName: getMonthName(1),
  };
}
