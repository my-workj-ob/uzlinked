"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useSettings,
  useUpdateSettings,
  useDeleteAccount,
  SecurityLog,
} from "@/hooks/use-queries";
import {
  User,
  ShieldCheck,
  History,
  AlertTriangle,
  Camera,
  Lock,
  RotateCw,
  MessageCircle,
  Users,
  Megaphone,
  Globe2,
  Bell,
  Eye,
  EyeOff,
  ShieldQuestion,
  KeyRound,
  UserX,
  ChevronRight,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { useUploadThing } from "@/utils/uploadthing/uploadthing";
import { createClient } from "@/utils/supabase/client";

type SettingsTab = "profile" | "security" | "logs" | "danger" | "chat" | "groups";

const NAV_ITEMS: {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
  danger?: boolean;
}[] = [
    { id: "profile", label: "Profil sozlamalari", icon: User },
    { id: "security", label: "Xavfsizlik va maxfiylik", icon: ShieldCheck },
    { id: "logs", label: "Faollik tarixi", icon: History },
    { id: "chat", label: "Xabarlar sozlamalari", icon: MessageCircle },
    { id: "groups", label: "Guruh va kanallar", icon: Users },
    { id: "danger", label: "Xavfli hudud", icon: AlertTriangle, danger: true },
  ];

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 cursor-pointer ${checked
          ? "bg-blue-600"
          : "bg-slate-200 dark:bg-slate-700"
        }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${checked ? "translate-x-[22px]" : "translate-x-[3px]"
          }`}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  control,
  border = true,
}: {
  title: string;
  description: string;
  control: React.ReactNode;
  border?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-6 py-4 ${border ? "border-b border-slate-100 dark:border-slate-800" : ""
        }`}
    >
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h4>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400 max-w-md">
          {description}
        </p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Card({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  children,
}: {
  icon?: React.ElementType;
  iconColor?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm shadow-slate-900/[0.02] overflow-hidden">
      <div className="px-6 pt-6 pb-1">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconColor || "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2.25} />
            </span>
          )}
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
        </div>
        {subtitle && (
          <p className="mt-1.5 text-[12.5px] text-slate-500 dark:text-slate-400 pl-[42px]">
            {subtitle}
          </p>
        )}
      </div>
      <div className="px-6 pb-6 pt-3">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const { data: settingsData, isLoading: settingsLoading, refetch } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const deleteAccountMutation = useDeleteAccount();

  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);

  const [chatReadReceiptsEnabled, setChatReadReceiptsEnabled] = useState(true);
  const [chatWhoCanMessage, setChatWhoCanMessage] = useState<
    "everyone" | "following" | "nobody"
  >("everyone");
  const [chatNotificationsEnabled, setChatNotificationsEnabled] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  const supabase = createClient();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    if (settingsData?.profile) {
      setNickname(settingsData.profile.nickname || "");
      setUsername(settingsData.profile.username || "");
      setBio(settingsData.profile.bio || "");
      setAvatarUrl(settingsData.profile.avatar_url || "");
      setAvatarPreview(settingsData.profile.avatar_url || "");
      setIsPrivate(settingsData.profile.is_private || false);
      setIsTwoFactorEnabled(settingsData.profile.is_two_factor_enabled || false);
      setChatReadReceiptsEnabled(settingsData.profile.chat_read_receipts_enabled ?? true);
      setChatWhoCanMessage(settingsData.profile.chat_who_can_message || "everyone");
      setChatNotificationsEnabled(settingsData.profile.chat_notifications_enabled ?? true);
    }
  }, [settingsData]);

  const fetchBlockedUsers = async () => {
    setLoadingBlocks(true);
    try {
      const { data, error } = await supabase.from("user_blocks").select(`
          id,
          blocked:profiles!blocked_id(id, username, nickname, avatar_url)
        `);
      if (error) throw error;
      setBlockedUsers(data || []);
    } catch (err) {
      console.error("Bloklanganlarni yuklashda xatolik:", err);
    } finally {
      setLoadingBlocks(false);
    }
  };

  const handleUnblock = async (blockId: string) => {
    try {
      const { error } = await supabase.from("user_blocks").delete().eq("id", blockId);
      if (error) throw error;
      toast.success("Foydalanuvchi blokdan chiqarildi");
      fetchBlockedUsers();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    }
  };

  useEffect(() => {
    if (activeTab === "chat") {
      fetchBlockedUsers();
    }
  }, [activeTab]);

  const handleSaveChatSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettingsMutation.mutateAsync({
        chat_read_receipts_enabled: chatReadReceiptsEnabled,
        chat_who_can_message: chatWhoCanMessage,
        chat_notifications_enabled: chatNotificationsEnabled,
      });
      toast.success("Xabarlar sozlamalari muvaffaqiyatli saqlandi");
    } catch (err: any) {
      toast.error(err.message || "Saqlashda xatolik yuz berdi");
    }
  };

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const { startUpload, isUploading } = useUploadThing("mediaUploader", {
    onClientUploadComplete: (res) => {
      const uploadedUrl = res?.[0]?.url;
      if (uploadedUrl) {
        handleSaveProfile(uploadedUrl);
      }
    },
    onUploadError: (error) => {
      console.error("Avatar yuklashda xatolik:", error);
      toast.error("Avatar yuklashda xatolik yuz berdi");
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async (uploadedAvatarUrl?: string) => {
    try {
      await updateSettingsMutation.mutateAsync({
        nickname: nickname.trim(),
        username: username.trim(),
        bio: bio.trim(),
        avatar_url: uploadedAvatarUrl || avatarUrl,
      });
      toast.success("Profil sozlamalari muvaffaqiyatli saqlandi");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Saqlashda xatolik yuz berdi");
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !username.trim()) {
      toast.error("Nickname va Username bo'limlarini to'ldirish majburiy");
      return;
    }

    if (avatarFile) {
      toast.loading("Rasm yuklanmoqda...", { id: "avatar-upload" });
      try {
        await startUpload([avatarFile]);
        toast.dismiss("avatar-upload");
      } catch (e) {
        toast.dismiss("avatar-upload");
      }
    } else {
      await handleSaveProfile();
    }
  };

  const handleTogglePrivacy = async (checked: boolean) => {
    try {
      setIsPrivate(checked);
      await updateSettingsMutation.mutateAsync({ is_private: checked });
      toast.success(
        checked ? "Profil maxfiy rejimga o'tkazildi" : "Profil hammaga ochiq rejimga o'tkazildi"
      );
      refetch();
    } catch (err: any) {
      setIsPrivate(!checked);
      toast.error(err.message || "Xatolik yuz berdi");
    }
  };

  const handleToggle2FA = async (checked: boolean) => {
    try {
      setIsTwoFactorEnabled(checked);
      await updateSettingsMutation.mutateAsync({ is_two_factor_enabled: checked });
      toast.success(checked ? "Ikki bosqichli faollashtirildi (2FA)" : "Ikki bosqichli o'chirildi (2FA)");
      refetch();
    } catch (err: any) {
      setIsTwoFactorEnabled(!checked);
      toast.error(err.message || "Xatolik yuz berdi");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Parollar mos kelmadi");
      return;
    }

    setIsPasswordUpdating(true);
    try {
      await updateSettingsMutation.mutateAsync({ password: newPassword });
      toast.success("Parol muvaffaqiyatli yangilandi");
      setNewPassword("");
      setConfirmPassword("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Parolni o'zgartirishda xatolik yuz berdi");
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== "o'chirish") {
      toast.error("Iltimos, tasdiqlash so'zini to'g'ri kiriting");
      return;
    }

    try {
      await deleteAccountMutation.mutateAsync();
      toast.success("Hisobingiz to'liq o'chirildi");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message || "Hisobni o'chirishda xatolik yuz berdi");
    }
  };

  const getLogEventLabel = (type: string) => {
    switch (type) {
      case "login":
        return "Tizimga kirish";
      case "logout":
        return "Tizimdan chiqish";
      case "password_change":
        return "Parol o'zgartirildi";
      case "privacy_toggle":
        return "Maxfiylik sozlamasi o'zgartirildi";
      case "two_factor_toggle":
        return "2FA sozlamasi o'zgartirildi";
      case "account_delete_attempt":
        return "Hisobni o'chirishga urinish";
      default:
        return type;
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-400">
        <RotateCw className="h-7 w-7 animate-spin text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
        <p className="text-xs font-semibold uppercase tracking-wider">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-16 text-slate-800 dark:text-slate-200">
      {/* Title */}
      <div className="mb-8 hidden md:block">
        <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Sozlamalar
        </h1>
        <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mt-1">
          Profilingiz va hisobingiz xavfsizlik sozlamalarini boshqaring
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
        {/* Navigation Sidebar */}
        <aside className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none shrink-0 select-none">
          {NAV_ITEMS.map(({ id, label, icon: Icon, danger }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all shrink-0 md:w-full whitespace-nowrap ${active
                    ? danger
                      ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                      : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
              >
                <Icon
                  className="h-[18px] w-[18px] shrink-0"
                  strokeWidth={active ? 2.4 : 2}
                />
                <span>{label}</span>
                {active && (
                  <ChevronRight className="h-3.5 w-3.5 ml-auto hidden md:block opacity-60" strokeWidth={2.5} />
                )}
              </button>
            );
          })}
        </aside>

        {/* Content Section */}
        <div className="min-w-0">
          {/* 1. Profile Settings Tab */}
          {activeTab === "profile" && (
            <Card icon={User} title="Profil sozlamalari" subtitle="Ommaviy profilingizda ko'rinadigan ma'lumotlar">
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center sm:flex-row gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-full ring-2 ring-offset-2 ring-blue-600 dark:ring-offset-slate-900 flex-shrink-0"
                  >
                    <img
                      src={
                        avatarPreview ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(nickname || "U")}`
                      }
                      alt="avatar preview"
                      className="h-full w-full object-cover rounded-full transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100 rounded-full">
                      <Camera className="h-5 w-5 text-white" strokeWidth={2} />
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />

                  <div className="text-center sm:text-left">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5" strokeWidth={2.25} />
                      Rasmni o'zgartirish
                    </button>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                      Tavsiya etiladi: kvadrat tasvir (PNG, JPG yoki WebP).
                    </p>
                  </div>
                </div>

                {/* Nickname & Username Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Nickname
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Taxallusingiz"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Foydalanuvchi nomi
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] font-medium select-none">
                        @
                      </span>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="username"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-7 pr-3.5 py-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Bio Section */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    O'zingiz haqingizda
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Qisqacha ma'lumot..."
                    maxLength={160}
                    className="min-h-[100px] w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-3 text-[13px] font-medium text-slate-700 dark:text-slate-300 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  />
                  <p className="mt-1 text-right text-[11px] text-slate-400">{bio.length}/160</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={updateSettingsMutation.isPending || isUploading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold rounded-xl active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100 cursor-pointer shadow-sm shadow-blue-600/20"
                  >
                    {(updateSettingsMutation.isPending || isUploading) && (
                      <RotateCw className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                    )}
                    Saqlash
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* 2. Security & Privacy Tab */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <Card icon={ShieldCheck} title="Maxfiylik va himoya">
                <div>
                  <SettingRow
                    title="Maxfiy hisob"
                    description="Faollashtirilganda, postlaringizni faqat siz tasdiqlagan obunachilar ko'ra oladi."
                    control={<Toggle checked={isPrivate} onChange={handleTogglePrivacy} />}
                  />
                  <SettingRow
                    border={false}
                    title="Ikki bosqichli kirish (2FA)"
                    description="Tizimga kirishda hisobingiz xavfsizligi uchun qo'shimcha tasdiqlash so'raladi."
                    control={<Toggle checked={isTwoFactorEnabled} onChange={handleToggle2FA} />}
                  />
                </div>
              </Card>

              <Card icon={KeyRound} title="Parolni o'zgartirish">
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Yangi parol
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" strokeWidth={2} />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Kamida 6 belgi"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-10 pr-10 py-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Parolni tasdiqlash
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" strokeWidth={2} />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Parolni qayta yozing"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-10 pr-10 py-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isPasswordUpdating}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold rounded-xl active:scale-95 transition-all disabled:opacity-60 cursor-pointer shadow-sm shadow-blue-600/20"
                    >
                      {isPasswordUpdating && <RotateCw className="h-4 w-4 animate-spin" strokeWidth={2.5} />}
                      Parolni yangilash
                    </button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* 3. Security Logs Tab */}
          {activeTab === "logs" && (
            <Card icon={History} title="Faollik va tizim jurnali" subtitle="Hisobingizda amalga oshirilgan oxirgi xavfsizlik va kirish amallari">
              <div className="overflow-x-auto -mx-2">
                <table className="w-full border-collapse text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead>
                    <tr className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      <th className="px-2 pb-3">Amal turi</th>
                      <th className="px-2 pb-3">IP manzil</th>
                      <th className="px-2 pb-3">Qurilma</th>
                      <th className="px-2 pb-3 text-right">Sana / Vaqt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {settingsData?.logs && settingsData.logs.length > 0 ? (
                      settingsData.logs.map((log: SecurityLog) => (
                        <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-2 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {getLogEventLabel(log.event_type)}
                          </td>
                          <td className="px-2 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {log.ip_address || "127.0.0.1"}
                          </td>
                          <td className="px-2 py-3 max-w-[180px] truncate text-slate-500 dark:text-slate-400" title={log.user_agent || ""}>
                            {log.user_agent || "Brauzer"}
                          </td>
                          <td className="px-2 py-3 text-right font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("uz-UZ", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-400 dark:text-slate-500">
                          <History className="h-7 w-7 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
                          Hozircha xavfsizlik jurnallari mavjud emas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Xabarlar sozlamalari Tab */}
          {activeTab === "chat" && (
            <div className="space-y-6">
              <Card icon={MessageCircle} title="Xabarlar va chat sozlamalari">
                <form onSubmit={handleSaveChatSettings} className="space-y-0">
                  <SettingRow
                    title="O'qilganlik bildirishnomalari"
                    description="Siz yuborgan xabarlarning o'qilganligini boshqalar ko'rishiga ruxsat berish."
                    control={<Toggle checked={chatReadReceiptsEnabled} onChange={setChatReadReceiptsEnabled} />}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Kimlar xabar yozishi mumkin
                      </h4>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400 max-w-md">
                        Sizga to'g'ridan-to'g'ri xabar yubora oladigan foydalanuvchilar doirasi.
                      </p>
                    </div>

                    <select
                      value={chatWhoCanMessage}
                      onChange={(e: any) => setChatWhoCanMessage(e.target.value)}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 cursor-pointer min-w-[170px]"
                    >
                      <option value="everyone">Hamma</option>
                      <option value="following">Faqat obunachilar</option>
                      <option value="nobody">Hech kim</option>
                    </select>
                  </div>

                  <SettingRow
                    border={false}
                    title="Chat bildirishnomalari"
                    description="Yangi xabar kelganda bildirishnoma ko'rsatish."
                    control={<Toggle checked={chatNotificationsEnabled} onChange={setChatNotificationsEnabled} />}
                  />

                  <div className="flex justify-end pt-5 mt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="submit"
                      disabled={updateSettingsMutation.isPending}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold rounded-xl active:scale-95 transition-all disabled:opacity-60 cursor-pointer shadow-sm shadow-blue-600/20"
                    >
                      {updateSettingsMutation.isPending && <RotateCw className="h-4 w-4 animate-spin" strokeWidth={2.5} />}
                      Sozlamalarni saqlash
                    </button>
                  </div>
                </form>
              </Card>

              <Card icon={UserX} iconColor="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" title="Bloklangan foydalanuvchilar" subtitle="Bloklangan foydalanuvchilar sizga xabar yubora olmaydi">
                {loadingBlocks ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase tracking-wide py-2">
                    <RotateCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
                    Yuklanmoqda...
                  </div>
                ) : blockedUsers.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {blockedUsers.map((block) => (
                      <div key={block.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              block.blocked?.avatar_url ||
                              "https://ui-avatars.com/api/?name=" + encodeURIComponent(block.blocked?.nickname || "U")
                            }
                            alt=""
                            className="w-9 h-9 object-cover rounded-full bg-slate-100 dark:bg-slate-800"
                          />
                          <div className="text-left">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {block.blocked?.nickname}
                            </h4>
                            <p className="text-[11px] text-slate-450 dark:text-slate-500 font-medium">
                              @{block.blocked?.username}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUnblock(block.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                        >
                          <X className="h-3 w-3" strokeWidth={2.5} />
                          Blokdan chiqarish
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <UserX className="h-7 w-7 mx-auto mb-2 text-slate-300 dark:text-slate-700" strokeWidth={1.5} />
                    <p className="text-xs text-slate-400 font-medium">Siz hech kimni bloklamagansiz</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Groups & Channels Settings Tab */}
          {activeTab === "groups" && (
            <div className="space-y-6">
              <Card icon={Users} iconColor="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400" title="Guruh sozlamalari" subtitle="Telegramdagi kabi — har bir guruh yoki kanalda alohida sozlamalar mavjud">
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { icon: Users, color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400", label: "A'zolarni boshqarish", desc: "A'zo qo'shish, chiqarish va rol berish" },
                    { icon: Megaphone, color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-400", label: "Kanal ulashish", desc: "Xabarlarni guruh/kanal uchun ulashish" },
                    { icon: Globe2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400", label: "Ommaviy / Maxfiy rejim", desc: "Kimlar qo'shila olishini sozlash" },
                    { icon: Bell, color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400", label: "Bildirishnomalar", desc: "Guruh xabarlari uchun ovoz sozlamalari" },
                    { icon: Lock, color: "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400", label: "Maxfiy sozlamalar", desc: "Faqat adminga yozish ruxsati" },
                  ].map(({ icon: Icon, color, label, desc }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                        <Icon className="w-4 h-4" strokeWidth={2.25} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{label}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{desc}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        Mavjud
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="rounded-2xl border border-violet-100 dark:border-violet-500/20 bg-violet-50/40 dark:bg-violet-500/[0.04] p-6">
                <h3 className="text-sm font-bold text-violet-700 dark:text-violet-400 mb-3 flex items-center gap-2">
                  <Megaphone className="w-4 h-4" strokeWidth={2.25} />
                  Guruh yoki kanal qanday yaratiladi?
                </h3>
                <ol className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {[
                    "Xabarlar sahifasiga o'ting",
                    <>Yuqori o'ng burchakdagi <strong className="text-slate-800 dark:text-slate-200 font-bold">guruh</strong> yoki <strong className="text-slate-800 dark:text-slate-200 font-bold">kanal</strong> tugmasini bosing</>,
                    "Nom, username va tavsif kiriting",
                    "Ommaviy yoki maxfiy rejimni tanlang",
                    "\"Yaratish\" tugmasini bosing",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 text-[10px] font-extrabold">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* 4. Danger Zone Tab */}
          {activeTab === "danger" && (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/40 dark:bg-rose-500/[0.04] p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <Trash2 className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-bold text-rose-700 dark:text-rose-400">
                    Hisobni o'chirish
                  </h2>
                  <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-2 max-w-lg leading-relaxed">
                    Ushbu amal hisobingizni butunlay o'chirib tashlaydi. Postlar, Reels, izohlar va layklar
                    qayta tiklanmaydigan tarzda o'chiriladi.
                  </p>

                  <div className="mt-5">
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-sm shadow-rose-600/20"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                      Profilni o'chirish
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Account Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200 select-none">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-xl">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText("");
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <X className="h-4 w-4" strokeWidth={2.25} />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 mx-auto mb-4">
              <ShieldQuestion className="h-6 w-6" strokeWidth={2} />
            </div>

            <h3 className="mb-2 text-center text-base font-bold text-slate-900 dark:text-slate-100">
              Ishonchingiz komilmi?
            </h3>
            <p className="text-center text-[12.5px] text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Hisobingizni o'chirish uchun quyidagi maydonga{" "}
              <strong className="text-rose-500 font-bold">o'chirish</strong> so'zini yozing:
            </p>

            <div className="mb-6">
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="o'chirish"
                className="w-full text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-[13px] font-semibold text-slate-900 dark:text-slate-100 focus:border-rose-500 dark:focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-3 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Bekor qilish
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.toLowerCase() !== "o'chirish" || deleteAccountMutation.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white py-3 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
              >
                {deleteAccountMutation.isPending && <RotateCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />}
                {deleteAccountMutation.isPending ? "O'chirilmoqda..." : "Ha, o'chirilsin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}