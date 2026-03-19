"use client";

import Image from "next/image";
import { cn, getInitials } from "@/lib/utils";

interface UserAvatarProps {
  user: {
    name?: string | null;
    image?: string | null;
    isOnline?: boolean;
  };
  size?: "xs" | "sm" | "md" | "lg";
  showOnline?: boolean;
}

const sizeMap = {
  xs: "h-7 w-7 text-xs",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

const dotMap = {
  xs: "h-2 w-2 bottom-0 right-0",
  sm: "h-2.5 w-2.5 bottom-0 right-0",
  md: "h-3 w-3 bottom-0 right-0",
  lg: "h-3.5 w-3.5 bottom-0.5 right-0.5",
};

const pixelMap = {
  xs: 28,
  sm: 32,
  md: 40,
  lg: 48,
};

export function UserAvatar({ user, size = "md", showOnline = false }: UserAvatarProps) {
  return (
    <div className="relative flex-shrink-0">
      {user.image ? (
        <Image
          src={user.image}
          alt={user.name ?? "User"}
          width={pixelMap[size]}
          height={pixelMap[size]}
          className={cn("rounded-full object-cover", sizeMap[size])}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className={cn(
          "rounded-full bg-violet-600/20 text-violet-400 font-semibold flex items-center justify-center",
          sizeMap[size]
        )}>
          {getInitials(user.name)}
        </div>
      )}
      {showOnline && (
        <span className={cn(
          "absolute rounded-full border-2 border-neutral-900",
          dotMap[size],
          user.isOnline ? "bg-green-500" : "bg-neutral-600"
        )} />
      )}
    </div>
  );
}