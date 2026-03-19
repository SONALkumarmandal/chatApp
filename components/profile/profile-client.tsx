"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Camera, Check, X,
  Pencil, Clock, Mail, Shield,
} from "lucide-react";
import { UserAvatar } from "@/components/chat/user-avatar";
import { formatLastSeen } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  "Hey there! I am using ChitChat.",
  "Available",
  "Busy",
  "At work",
  "At school",
  "Battery about to die 🔋",
  "Can't talk, ChitChat only 😄",
  "In a meeting",
  "Do not disturb 🚫",
];

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  status: string | null;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}

export function ProfileClient() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [customStatus, setCustomStatus] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        setProfile(data);
        setNewName(data.name ?? "");
        setNewStatus(data.status ?? "");
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      setProfile(data);
      setEditingName(false);
      await update({ name: newName });
      toast.success("Name updated!");
    } catch {
      toast.error("Failed to update name");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStatus = async (status: string) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      setProfile(data);
      setNewStatus(status);
      setEditingStatus(false);
      setCustomStatus(false);
      toast.success("Status updated!");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Profile</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Avatar section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <UserAvatar user={profile ?? {}} size="lg" showOnline />
            <button
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center border-2 border-neutral-950 hover:bg-violet-500 transition-colors"
              title="Change photo (coming soon)"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{profile?.name}</p>
            <p className="text-sm text-green-500 font-medium">Online</p>
          </div>
        </motion.div>

        {/* Info cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          {/* Name */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Name</p>
              <button
                onClick={() => setEditingName(true)}
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>

            {editingName ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-violet-500 transition-colors"
                  placeholder="Your name"
                />
                <button
                  onClick={handleSaveName}
                  disabled={isSaving}
                  className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors"
                >
                  <Check className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => { setEditingName(false); setNewName(profile?.name ?? ""); }}
                  className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition-colors"
                >
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>
            ) : (
              <p className="text-white font-medium">{profile?.name}</p>
            )}
          </div>

          {/* Status */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Status</p>
              <button
                onClick={() => setEditingStatus(!editingStatus)}
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-white font-medium mb-3">{profile?.status}</p>

            {editingStatus && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2 mt-3 border-t border-neutral-800 pt-3"
              >
                {/* Preset options */}
                <p className="text-xs text-neutral-500 mb-2">Quick select</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSaveStatus(s)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                        profile?.status === s
                          ? "bg-violet-600/20 text-violet-400 border border-violet-600/30"
                          : "hover:bg-neutral-800 text-neutral-300"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Custom status */}
                <div className="pt-2 border-t border-neutral-800">
                  <p className="text-xs text-neutral-500 mb-2">Custom status</p>
                  <div className="flex gap-2">
                    <input
                      placeholder="Type a custom status..."
                      value={customStatus ? newStatus : ""}
                      onChange={(e) => { setNewStatus(e.target.value); setCustomStatus(true); }}
                      onFocus={() => setCustomStatus(true)}
                      className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-violet-500 transition-colors"
                    />
                    <button
                      onClick={() => handleSaveStatus(newStatus)}
                      disabled={!newStatus.trim() || isSaving}
                      className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Email */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-3.5 h-3.5 text-neutral-500" />
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Email</p>
            </div>
            <p className="text-white font-medium">{profile?.email}</p>
          </div>

          {/* Last seen */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-neutral-500" />
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Last Seen</p>
            </div>
            <p className="text-white font-medium">
              {profile?.isOnline ? "Currently online" : formatLastSeen(profile?.lastSeen ?? new Date())}
            </p>
          </div>

          {/* Member since */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-3.5 h-3.5 text-neutral-500" />
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Member Since</p>
            </div>
            <p className="text-white font-medium">
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}