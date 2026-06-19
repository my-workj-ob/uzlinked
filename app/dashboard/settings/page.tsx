"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  useSettings, 
  useUpdateSettings, 
  useDeleteAccount,
  SecurityLog 
} from "@/hooks/use-queries";
import { 
  HiUser, 
  HiShieldCheck, 
  HiQueueList, 
  HiExclamationTriangle,
  HiCamera,
  HiLockClosed,
  HiCheck,
  HiArrowPath
} from "react-icons/hi2";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useUploadThing } from "@/utils/uploadthing/uploadthing";

type SettingsTab = "profile" | "security" | "logs" | "danger";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // React Query hooks
  const { data: settingsData, isLoading: settingsLoading, refetch } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const deleteAccountMutation = useDeleteAccount();

  // Form states
  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);

  // Password change states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);

  // Avatar upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete account confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Sync data with form fields once loaded
  useEffect(() => {
    if (settingsData?.profile) {
      setNickname(settingsData.profile.nickname || "");
      setUsername(settingsData.profile.username || "");
      setBio(settingsData.profile.bio || "");
      setAvatarUrl(settingsData.profile.avatar_url || "");
      setAvatarPreview(settingsData.profile.avatar_url || "");
      setIsPrivate(settingsData.profile.is_private || false);
      setIsTwoFactorEnabled(settingsData.profile.is_two_factor_enabled || false);
    }
  }, [settingsData]);

  // Clean up avatar preview URL
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // UploadThing hook
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
        checked 
          ? "Profil maxfiy rejimga o'tkazildi" 
          : "Profil hammaga ochiq rejimga o'tkazildi"
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
      toast.success(
        checked 
          ? "Ikki bosqichli faollashtirildi (2FA)" 
          : "Ikki bosqichli o'chirildi (2FA)"
      );
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
      confirmPassword && setConfirmPassword("");
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

  // Helper function to map activity logs types to human-readable text
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
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-slate-400">
        <HiArrowPath className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-xs font-semibold uppercase tracking-wider">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl pb-12 text-slate-800 dark:text-slate-200">
      
      {/* Title */}
      <div className="mb-6 hidden md:block">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Sozlamalar
        </h1>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
          Profilingiz va hisobingiz xavfsizlik sozlamalarini boshqaring
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        
        {/* Navigation Sidebar */}
        <aside className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/5 pr-0 md:pr-4 shrink-0 col-span-1 select-none">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all shrink-0 md:w-full ${
              activeTab === "profile"
                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-950 dark:hover:text-slate-100"
            }`}
          >
            <HiUser className="h-5 w-5" />
            <span>Profil Sozlamalari</span>
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all shrink-0 md:w-full ${
              activeTab === "security"
                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-950 dark:hover:text-slate-100"
            }`}
          >
            <HiShieldCheck className="h-5 w-5" />
            <span>Xavfsizlik va Maxfiylik</span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all shrink-0 md:w-full ${
              activeTab === "logs"
                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-slate-950 dark:hover:text-slate-100"
            }`}
          >
            <HiQueueList className="h-5 w-5" />
            <span>Faollik Tarixi</span>
          </button>

          <button
            onClick={() => setActiveTab("danger")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all shrink-0 md:w-full ${
              activeTab === "danger"
                ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-red-500"
            }`}
          >
            <HiExclamationTriangle className="h-5 w-5" />
            <span>Xavfli Hudud</span>
          </button>
        </aside>

        {/* Content Section */}
        <div className="col-span-1 md:col-span-3">
          
          {/* 1. Profile Settings Tab */}
          {activeTab === "profile" && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 p-6 shadow-sm transition-colors duration-300">
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                <HiUser className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Profil Sozlamalari
              </h2>

              <form onSubmit={handleProfileSubmit} className="space-y-6">
                
                {/* Avatar Section */}
                <div className="flex flex-col items-center sm:flex-row gap-5 pb-6 border-b border-slate-100 dark:border-white/5">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-full border-2 border-blue-600 p-0.5 bg-white dark:bg-slate-950 flex-shrink-0"
                  >
                    <img
                      src={
                        avatarPreview ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(nickname || "U")}`
                      }
                      alt="avatar preview"
                      className="h-full w-full object-cover rounded-full transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <HiCamera className="h-6 w-6 text-white" />
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
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                    >
                      Rasmni o'zgartirish
                    </button>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                      Tavsiya etiladi: kvadrat tasvir (PNG, JPG yoki WebP formatlarida).
                    </p>
                  </div>
                </div>

                {/* Nickname & Username Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Nickname
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Taxallusingiz"
                      className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 p-3.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Foydalanuvchi nomi (Username)
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 p-3.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                      required
                    />
                  </div>
                </div>

                {/* Bio Section */}
                <div>
                  <label className="mb-1.5 ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    O'zingiz haqingizda (Bio)
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Qisqacha ma'lumot..."
                    className="min-h-[100px] w-full resize-none rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 p-3.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updateSettingsMutation.isPending || isUploading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all disabled:opacity-75 cursor-pointer flex items-center gap-2"
                  >
                    {(updateSettingsMutation.isPending || isUploading) && (
                      <HiArrowPath className="h-4 w-4 animate-spin" />
                    )}
                    <span>Saqlash</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2. Security & Privacy Tab */}
          {activeTab === "security" && (
            <div className="space-y-6">
              
              {/* Privacy settings */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 p-6 shadow-sm transition-colors duration-300">
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                  <HiShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Maxfiylik va Himoya
                </h2>

                <div className="space-y-6">
                  
                  {/* Account Privacy Toggle */}
                  <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-white/5">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Maxfiy hisob (Private Account)
                      </h4>
                      <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-1 max-w-md">
                        Faollashtirilganda, sizning postlaringiz va kontentingizni faqat siz tasdiqlagan obunachilar ko'ra oladi.
                      </p>
                    </div>

                    <button
                      onClick={() => handleTogglePrivacy(!isPrivate)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none cursor-pointer border ${
                        isPrivate 
                          ? "bg-blue-600 border-blue-600" 
                          : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
                          isPrivate ? "translate-x-5.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* 2FA Toggle */}
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Ikki bosqichli kirish (2FA)
                      </h4>
                      <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-1 max-w-md">
                        Tizimga kirish paytida sizning hisobingiz xavfsizligini ta'minlash uchun qo'shimcha tasdiqlashni so'raydi.
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggle2FA(!isTwoFactorEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none cursor-pointer border ${
                        isTwoFactorEnabled 
                          ? "bg-blue-600 border-blue-600" 
                          : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
                          isTwoFactorEnabled ? "translate-x-5.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Change */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 p-6 shadow-sm transition-colors duration-300">
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                  <HiLockClosed className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Parolni O'zgartirish
                </h2>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Yangi Parol
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Kamida 6 belgi"
                        className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 p-3.5 pr-10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3.5 text-slate-400 dark:text-slate-650 hover:text-slate-600 dark:hover:text-slate-400"
                      >
                        {showNewPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 ml-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Parolni tasdiqlash
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Parolni qayta yozing"
                        className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 p-3.5 pr-10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 transition-all focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3.5 text-slate-400 dark:text-slate-650 hover:text-slate-600 dark:hover:text-slate-400"
                      >
                        {showConfirmPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isPasswordUpdating}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all disabled:opacity-75 cursor-pointer flex items-center gap-2"
                    >
                      {isPasswordUpdating && <HiArrowPath className="h-4 w-4 animate-spin" />}
                      <span>Parolni yangilash</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 3. Security Logs Tab */}
          {activeTab === "logs" && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 p-6 shadow-sm transition-colors duration-300">
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                <HiQueueList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Faollik va Tizim Jurnali
              </h2>
              <p className="text-[11px] text-slate-450 dark:text-slate-500 mb-6">
                Hisobingizda amalga oshirilgan oxirgi 10 ta xavfsizlik va kirish amallari tarixi
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-slate-700 dark:text-slate-350">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <th className="pb-3">Amal turi</th>
                      <th className="pb-3">IP manzil</th>
                      <th className="pb-3">Qurilma / User-Agent</th>
                      <th className="pb-3 text-right">Sana / Vaqt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {settingsData?.logs && settingsData.logs.length > 0 ? (
                      settingsData.logs.map((log: SecurityLog) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                          <td className="py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {getLogEventLabel(log.event_type)}
                          </td>
                          <td className="py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {log.ip_address || "127.0.0.1"}
                          </td>
                          <td className="py-3 max-w-[200px] truncate text-slate-500 dark:text-slate-450" title={log.user_agent || ""}>
                            {log.user_agent || "Brauzer"}
                          </td>
                          <td className="py-3 text-right font-medium text-slate-400 dark:text-slate-500">
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
                        <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500">
                          Hozircha xavfsizlik jurnallari mavjud emas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Danger Zone Tab */}
          {activeTab === "danger" && (
            <div className="rounded-2xl border border-rose-200/50 dark:border-rose-950/30 bg-rose-50/20 dark:bg-rose-950/5 p-6 shadow-sm transition-colors duration-300">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-rose-100 dark:bg-rose-950/40 p-3 text-rose-600 dark:text-rose-400">
                  <HiExclamationTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-rose-700 dark:text-rose-450">
                    Hisobni o'chirish
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-lg leading-relaxed">
                    Ushbu amal hisobingizni butunlay o'chirib tashlaydi. Sizning barcha ma'lumotlaringiz (postlar, Reels, izohlar va layklar) qayta tiklanmaydigan qilib butunlay o'chiriladi.
                  </p>
                  
                  <div className="mt-6">
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
                    >
                      Profilni O'chirish
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
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200 select-none">
          <div className="relative w-full max-w-sm rounded-[2rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 p-6 sm:p-8">
            <h3 className="mb-2 text-center text-lg font-black text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
              <HiExclamationTriangle className="h-5 w-5 text-rose-500" />
              Ishonchingiz komilmi?
            </h3>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Hisobingizni o'chirish uchun quyidagi maydonga <strong className="text-rose-500 font-extrabold uppercase">o'chirish</strong> so'zini yozing:
            </p>

            <div className="mb-6">
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="o'chirish"
                className="w-full text-center rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 p-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:border-rose-500 dark:focus:border-rose-450 focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 py-3.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Bekor qilish
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.toLowerCase() !== "o'chirish" || deleteAccountMutation.isPending}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white py-3.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {deleteAccountMutation.isPending ? "O'chirilmoqda..." : "Ha, o'chirilsin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
