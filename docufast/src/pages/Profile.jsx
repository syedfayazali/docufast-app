import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, FileText, CreditCard, Bell, Headphones, LogOut, ChevronRight, Shield, Trash2, Camera, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import MembershipCard from "@/components/MembershipCard";
import AddressPicker from "@/components/AddressPicker";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { uploadAvatar } from "@/lib/avatar";

const menu = [
  { label: "My Applications", icon: FileText, to: "/applications" },
  { label: "Payment History", icon: CreditCard, to: "/payments" },
  { label: "Notifications", icon: Bell, to: "/notifications" },
  { label: "Help & Support", icon: Headphones, to: "/help" },
  { label: "About DocuFast India", icon: Shield, to: "/about" },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, checkUserAuth, updateUser } = useAuth();
  const items = user?.role === "admin"
    ? [{ label: "Admin Dashboard", icon: Shield, to: "/admin-dashboard" }, ...menu]
    : menu;

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = "/login";
  };

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoFailed, setPhotoFailed] = useState(false);
  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setPhotoError("");
    setUploadingPhoto(true);
    try {
      const url = await uploadAvatar(file, user.id);
      setPhotoFailed(false);
      updateUser({ avatar_url: url }); // show it immediately everywhere
      checkUserAuth(); // then re-sync with the database
    } catch (err) {
      setPhotoError(err.message || "Could not upload the photo.");
    }
    setUploadingPhoto(false);
  };

  const [deleting, setDeleting] = useState(false);
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      // Saved as a support request so the team can delete the account and data.
      const { error } = await supabase.from("support_requests").insert({
        name: user?.full_name || user?.email || "Customer",
        email: user?.email || "",
        mobile: "-",
        message: "ACCOUNT DELETION REQUEST. Please delete my account and personal data. Account id: " + (user?.id || ""),
      });
      if (error) throw error;
      await base44.auth.logout();
      window.location.href = "/login";
    } catch {
      setDeleting(false);
      alert("Could not send your request. Please contact us from the Contact page.");
    }
  };

  const displayName = user?.full_name || "Customer";
  const initials = (displayName || "C").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const memberSince = user?.created_date
    ? new Date(user.created_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        <div className="flex items-center gap-4 rounded-2xl bg-navy p-5 text-white">
          <div className="relative shrink-0">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gold text-navy">
              {user?.avatar_url && !photoFailed ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  onError={() => setPhotoFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-heading text-xl font-bold">{initials}</span>
              )}
            </div>
            <label
              className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-navy bg-white text-navy shadow"
              aria-label="Change profile photo"
            >
              {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} disabled={uploadingPhoto} />
            </label>
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold">{displayName}</h1>
            <p className="text-xs text-white/70">{user?.email || "—"}</p>
            <p className="mt-1 text-[11px] text-gold">Verified Customer</p>
          </div>
        </div>
        {photoError && (
          <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{photoError}</p>
        )}

        <div className="mt-4 rounded-2xl border border-border bg-white p-4 shadow-card">
          <h2 className="px-1 font-heading text-sm font-bold text-navy">Account Information</h2>
          <dl className="mt-3 divide-y divide-border text-sm">
            <InfoRow label="Name" value={displayName} />
            <InfoRow label="Email" value={user?.email || "—"} />
            <InfoRow label="Account Type" value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Customer"} />
            <InfoRow label="Member Since" value={memberSince} />
          </dl>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-xs font-semibold text-red-600">
                <Trash2 className="h-4 w-4" /> Request Account Deletion
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Request deletion of your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  We will delete your account and personal information within 30 days. Payment and application records that we are legally required to keep may be retained. Applications already submitted to a government authority are not affected. You will be logged out now.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {deleting ? "Sending…" : "Yes, request deletion"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-white p-4 shadow-card">
          <h2 className="px-1 font-heading text-sm font-bold text-navy">Saved Addresses</h2>
          <p className="mb-3 px-1 text-[11px] text-muted-foreground">
            Saved once, used on every application — no need to type it again.
          </p>
          <AddressPicker selectable={false} />
        </div>

        <MembershipCard user={user} />

        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white shadow-card">
          {items.map(({ label, icon: Icon, to }, i) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${i !== menu.length - 1 ? "border-b border-border" : ""}`}
            >
              <Icon className="h-5 w-5 text-navy" />
              <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-3.5 text-sm font-semibold text-red-600"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </main>
      <BottomNav />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}