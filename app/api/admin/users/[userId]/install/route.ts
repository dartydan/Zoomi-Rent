import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/admin";
import type { InstallInfo, InstallRecord } from "@/lib/install";
import { INSTALL_METADATA_KEY } from "@/lib/install";
import {
  createCustomerFolder,
  uploadPhoto,
  uploadContract,
  isGoogleDriveConfigured,
} from "@/lib/google-drive";
import { getActiveSubscriptionProductName } from "@/lib/stripe-subscription";

export const dynamic = "force-dynamic";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/** Sum of all successful charges for the customer (lifetime value in dollars). Net of refunds and discounts. */
async function computeLifetimeValue(stripeCustomerId: string): Promise<number> {
  const stripe = getStripe();
  if (!stripe) return 0;
  try {
    let totalCents = 0;
    let hasMore = true;
    let startingAfter: string | undefined;
    while (hasMore) {
      const charges = await stripe.charges.list({
        customer: stripeCustomerId,
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const charge of charges.data) {
        if (charge.status === "succeeded") {
          const net = charge.amount - (charge.amount_refunded ?? 0);
          if (net > 0) totalCents += net;
        }
      }
      hasMore = charges.has_more;
      if (charges.data.length > 0) {
        startingAfter = charges.data[charges.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }
    return totalCents / 100;
  } catch {
    return 0;
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_CONTRACT_TYPE = "application/pdf";

function getMimeType(file: File): string {
  return file.type || "application/octet-stream";
}

function isAllowedImage(mime: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mime);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId } = await params;
    const user = await clerkClient.users.getUser(userId);
    const install = (user.publicMetadata?.[INSTALL_METADATA_KEY] ?? {}) as InstallInfo;
    const customerProfile = user.publicMetadata?.customerProfile as Record<string, unknown> | undefined;
    const clerkEmail = user.emailAddresses?.[0]?.emailAddress ?? undefined;
    const stripe = getStripe();
    let stripeCustomerId = (user.publicMetadata?.stripeCustomerId as string | undefined)?.trim() || null;
    if (stripe && !stripeCustomerId && clerkEmail) {
      const list = await stripe.customers.list({ email: clerkEmail, limit: 1 });
      if (list.data.length > 0 && !list.data[0].deleted) stripeCustomerId = list.data[0].id;
    }

    let mergedProfile: Record<string, unknown>;
    if (stripe && stripeCustomerId) {
      try {
        const sc = await stripe.customers.retrieve(stripeCustomerId);
        if (sc.deleted) throw new Error("deleted");
        const c = sc as Stripe.Customer;
        const nameParts = (c.name ?? "").trim().split(/\s+/);
        const firstName = nameParts.length > 0 ? nameParts[0] : undefined;
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;
        const addr = c.address;
        const address =
          addr?.line1 || addr?.city || addr?.state || addr?.postal_code
            ? [addr.line1, addr.city, addr.state, addr.postal_code].filter(Boolean).join(", ")
            : undefined;
        const activePlanName = await getActiveSubscriptionProductName(stripe, stripeCustomerId);
        mergedProfile = {
          ...(customerProfile ?? {}),
          firstName,
          lastName,
          email: c.email ?? undefined,
          phone: c.phone ?? undefined,
          address,
          street: addr?.line1 ?? undefined,
          city: addr?.city ?? undefined,
          state: addr?.state ?? undefined,
          zip: addr?.postal_code ?? undefined,
          selectedPlan: activePlanName ?? (customerProfile?.selectedPlan as string) ?? undefined,
        };
      } catch {
        mergedProfile = {
          ...(customerProfile ?? {}),
          email: (customerProfile?.email as string) || clerkEmail || undefined,
          firstName: ((customerProfile?.firstName as string) || user.firstName) ?? undefined,
          lastName: ((customerProfile?.lastName as string) || user.lastName) ?? undefined,
        };
      }
    } else {
      mergedProfile = {
        ...(customerProfile ?? {}),
        email: (customerProfile?.email as string) || clerkEmail || undefined,
        firstName: ((customerProfile?.firstName as string) || user.firstName) ?? undefined,
        lastName: ((customerProfile?.lastName as string) || user.lastName) ?? undefined,
      };
    }

    const profileAddress = (mergedProfile.address as string) ?? undefined;
    const installAddress = install.installAddress ?? profileAddress;
    const lifetimeValue =
      stripeCustomerId != null ? await computeLifetimeValue(stripeCustomerId) : 0;
    const installs: InstallRecord[] =
      Array.isArray(install.installs) && install.installs.length > 0
        ? install.installs
        : install.installDate
          ? [{ id: "legacy", installDate: install.installDate, uninstallDate: undefined, installAddress: install.installAddress, notes: install.notes, photoUrls: install.photoUrls, contractUrls: install.contractUrls }]
          : [];
    return NextResponse.json({
      ...install,
      installs,
      installAddress: installAddress ?? undefined,
      customerProfile: mergedProfile,
      lifetimeValue,
    });
  } catch (err) {
    console.error("Admin get install error:", err);
    return NextResponse.json(
      { error: "Failed to get install info" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId } = await params;
    const formData = await req.formData();

    const installIdRaw = (formData.get("installId") as string) ?? "";
    const installId = installIdRaw.trim() || "new";
    const installDate = (formData.get("installDate") as string) ?? "";
    const uninstallDate = (formData.get("uninstallDate") as string) ?? undefined;
    const installAddress = (formData.get("installAddress") as string) ?? undefined;
    const notes = (formData.get("notes") as string) ?? undefined;

    const user = await clerkClient.users.getUser(userId);
    const existing = (user.publicMetadata?.[INSTALL_METADATA_KEY] ?? {}) as InstallInfo;
    const existingInstalls: InstallRecord[] =
      Array.isArray(existing.installs) && existing.installs.length > 0
        ? existing.installs
        : existing.installDate
          ? [{ id: "legacy", installDate: existing.installDate, uninstallDate: undefined, installAddress: existing.installAddress, notes: existing.notes, photoUrls: existing.photoUrls, contractUrls: existing.contractUrls }]
          : [];

    const existingPhotoUrls: string[] = [];
    for (let i = 0; ; i++) {
      const v = formData.get(`existingPhotoUrls[${i}]`);
      if (v == null || typeof v !== "string") break;
      existingPhotoUrls.push(v);
    }
    const existingContractUrls: string[] = [];
    for (let i = 0; ; i++) {
      const v = formData.get(`existingContractUrls[${i}]`);
      if (v == null || typeof v !== "string") break;
      existingContractUrls.push(v);
    }

    const photoFiles = formData.getAll("photos") as File[];
    const contractFiles = formData.getAll("contracts") as File[];
    const newPhotos = photoFiles.filter((f): f is File => f instanceof File && f.size > 0);
    const newContracts = contractFiles.filter((f): f is File => f instanceof File && f.size > 0);

    let photoUrls = existingPhotoUrls.length ? existingPhotoUrls : [];
    let contractUrls = existingContractUrls.length ? existingContractUrls : [];
    let driveFolderId = existing.driveFolderId;

    if (installId !== "new") {
      const editRec = existingInstalls.find((r) => r.id === installId);
      if (editRec) {
        if (!existingPhotoUrls.length && !existingContractUrls.length) {
          photoUrls = editRec.photoUrls ?? [];
          contractUrls = editRec.contractUrls ?? [];
        }
      }
    }

    if (newPhotos.length > 0 || newContracts.length > 0) {
      if (!isGoogleDriveConfigured()) {
        return NextResponse.json(
          { error: "Google Drive is not configured. Set GOOGLE_DRIVE_ROOT_FOLDER_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY." },
          { status: 400 }
        );
      }

      const firstName = (user.firstName as string) ?? "";
      const lastName = (user.lastName as string) ?? "";
      const customerName = [firstName, lastName].filter(Boolean).join(" ") || userId;

      const folderId = driveFolderId ?? (await createCustomerFolder(userId, customerName));
      driveFolderId = folderId;

      for (const file of newPhotos) {
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `File ${file.name} exceeds 10MB limit` },
            { status: 400 }
          );
        }
        const mime = getMimeType(file);
        if (!isAllowedImage(mime)) {
          return NextResponse.json(
            { error: `Invalid image type: ${file.name}. Use JPEG, PNG, or WebP.` },
            { status: 400 }
          );
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const baseName = file.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9.-]/g, "");
        const fileName = baseName || `photo-${Date.now()}.jpg`;
        const url = await uploadPhoto(buffer, folderId, fileName, mime);
        photoUrls = [...photoUrls, url];
      }

      for (const file of newContracts) {
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `File ${file.name} exceeds 10MB limit` },
            { status: 400 }
          );
        }
        const mime = getMimeType(file);
        if (mime !== ALLOWED_CONTRACT_TYPE) {
          return NextResponse.json(
            { error: `Invalid contract type: ${file.name}. Use PDF.` },
            { status: 400 }
          );
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const baseName = file.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9.-]/g, "");
        const fileName = baseName || `contract-${Date.now()}.pdf`;
        const url = await uploadContract(buffer, folderId, fileName);
        contractUrls = [...contractUrls, url];
      }
    }

    const normalizeDateTime = (s: string) => {
      const t = s?.trim();
      if (!t) return t;
      if (t.includes("T")) {
        if (t.endsWith("Z") || t.includes("-") && t.lastIndexOf("-") > 10) return t;
        if (t.length >= 19) return t.slice(0, 19);
        if (t.length >= 16) return t.slice(0, 16) + ":00";
      }
      return t.slice(0, 10) + "T12:00:00.000Z";
    };
    const record: InstallRecord = {
      id: installId === "new" ? crypto.randomUUID() : installId,
      installDate: normalizeDateTime(installDate || (installId !== "new" ? existingInstalls.find((r) => r.id === installId)?.installDate ?? "" : "")),
      uninstallDate: uninstallDate && uninstallDate.trim() ? normalizeDateTime(uninstallDate.trim()) : undefined,
      installAddress: installAddress?.trim() || undefined,
      notes: notes?.trim() || undefined,
      photoUrls: photoUrls.length ? photoUrls : undefined,
      contractUrls: contractUrls.length ? contractUrls : undefined,
    };

    const installs: InstallRecord[] =
      installId === "new"
        ? [...existingInstalls, record]
        : existingInstalls.map((r) => (r.id === installId ? record : r));

    const install: InstallInfo = {
      installs,
      driveFolderId: driveFolderId ?? existing.driveFolderId,
      propertyId: existing.propertyId,
    };

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        [INSTALL_METADATA_KEY]: install,
      },
    });

    return NextResponse.json({ ...install, installs });
  } catch (err) {
    console.error("Admin update install error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId } = await params;
    const { searchParams } = new URL(req.url);
    const installId = searchParams.get("installId")?.trim();
    if (!installId) {
      return NextResponse.json({ error: "installId is required" }, { status: 400 });
    }

    const user = await clerkClient.users.getUser(userId);
    const existing = (user.publicMetadata?.[INSTALL_METADATA_KEY] ?? {}) as InstallInfo;
    const existingInstalls: InstallRecord[] =
      Array.isArray(existing.installs) && existing.installs.length > 0
        ? existing.installs
        : existing.installDate
          ? [{ id: "legacy", installDate: existing.installDate, uninstallDate: undefined, installAddress: existing.installAddress, notes: existing.notes, photoUrls: existing.photoUrls, contractUrls: existing.contractUrls }]
          : [];

    const installs = existingInstalls.filter((r) => r.id !== installId);
    const install: InstallInfo = {
      installs,
      driveFolderId: existing.driveFolderId,
      propertyId: existing.propertyId,
    };

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        [INSTALL_METADATA_KEY]: install,
      },
    });

    return NextResponse.json({ ...install, installs });
  } catch (err) {
    console.error("Admin delete install error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete" },
      { status: 500 }
    );
  }
}
