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

export const dynamic = "force-dynamic";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/** Sum of all successful charges for the customer (lifetime value in dollars). */
async function computeLifetimeValue(stripeCustomerId: string): Promise<number> {
  const stripe = getStripe();
  if (!stripe) return 0;
  try {
    // Fetch all successful charges (includes subscriptions, one-time payments, etc.)
    const charges = await stripe.charges.list({
      customer: stripeCustomerId,
      limit: 100,
    });
    const totalCents = charges.data
      .filter((charge) => charge.status === "succeeded" && !charge.refunded)
      .reduce((sum, charge) => sum + charge.amount, 0);
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
    const mergedProfile: Record<string, unknown> = {
      ...(customerProfile ?? {}),
      email: (customerProfile?.email as string) || clerkEmail || undefined,
      firstName: ((customerProfile?.firstName as string) || user.firstName) ?? undefined,
      lastName: ((customerProfile?.lastName as string) || user.lastName) ?? undefined,
    };
    const profileAddress = (mergedProfile.address as string) ?? undefined;
    const installAddress = install.installAddress ?? profileAddress;
    let stripeCustomerId = (user.publicMetadata?.stripeCustomerId as string | undefined)?.trim() || null;
    const stripe = getStripe();
    if (stripe && !stripeCustomerId && clerkEmail) {
      const list = await stripe.customers.list({ email: clerkEmail, limit: 1 });
      if (list.data.length > 0 && !list.data[0].deleted) stripeCustomerId = list.data[0].id;
    }
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

    const record: InstallRecord = {
      id: installId === "new" ? crypto.randomUUID() : installId,
      installDate: installDate || (installId !== "new" ? existingInstalls.find((r) => r.id === installId)?.installDate ?? "" : ""),
      uninstallDate: uninstallDate && uninstallDate.trim() ? uninstallDate.trim() : undefined,
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
