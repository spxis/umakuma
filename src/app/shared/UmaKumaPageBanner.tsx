import Image, { type StaticImageData } from "next/image";

import adminBanner from "@/images/umakuma-hero2.png";
import leaderboardHero from "@/images/umakuma-hero1.png";
import kumaClose from "@/images/kuma-close.png";
import umaClose from "@/images/uma-close.png";
import umaKumaLeft from "@/images/umakuma-1.png";
import umaKumaRight from "@/images/umakuma-2.png";
import userBanner from "@/images/umakuma-banner1.png";

type UmaKumaPageBannerVariant = "leaderboard" | "user" | "admin";

type UmaKumaPageBannerProps = {
  variant: UmaKumaPageBannerVariant;
  className?: string;
};

type BannerConfig = {
  centerImage: StaticImageData;
  leftDesktopImage?: StaticImageData;
  rightDesktopImage?: StaticImageData;
  frameClassName: string;
  centerImageClassName: string;
  sideImageClassName?: string;
};

const BANNER_CONFIG_BY_VARIANT: Record<UmaKumaPageBannerVariant, BannerConfig> = {
  leaderboard: {
    centerImage: leaderboardHero,
    leftDesktopImage: umaClose,
    rightDesktopImage: kumaClose,
    frameClassName: "h-28 sm:h-36 lg:h-44",
    centerImageClassName: "h-20 w-auto sm:h-24 lg:h-28",
    sideImageClassName: "h-24 w-auto xl:h-28",
  },
  user: {
    centerImage: userBanner,
    leftDesktopImage: umaKumaLeft,
    rightDesktopImage: umaKumaRight,
    frameClassName: "h-24 sm:h-32 lg:h-40",
    centerImageClassName: "h-16 w-auto sm:h-20 lg:h-24",
    sideImageClassName: "h-24 w-auto xl:h-28",
  },
  admin: {
    centerImage: adminBanner,
    frameClassName: "h-24 sm:h-32 lg:h-40",
    centerImageClassName: "h-16 w-auto sm:h-20 lg:h-24",
  },
};

export default function UmaKumaPageBanner({ variant, className }: UmaKumaPageBannerProps) {
  const config = BANNER_CONFIG_BY_VARIANT[variant];

  return (
    <section
      aria-hidden="true"
      className={`overflow-hidden rounded-2xl border border-line/80 bg-surface/80 shadow-[0_18px_40px_rgba(8,16,36,0.12)] ${className ?? ""}`}
    >
      <div className={`relative ${config.frameClassName}`}>
        <div className="grid h-full grid-cols-1 items-center lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="hidden h-full items-center justify-start pl-4 lg:flex">
            {config.leftDesktopImage ? (
              <Image
                src={config.leftDesktopImage}
                alt=""
                priority={variant === "leaderboard"}
                className={config.sideImageClassName}
              />
            ) : null}
          </div>
          <div className="flex h-full items-center justify-center px-2 sm:px-3">
            <Image
              src={config.centerImage}
              alt=""
              priority={variant === "leaderboard"}
              className={config.centerImageClassName}
            />
          </div>
          <div className="hidden h-full items-center justify-end pr-4 lg:flex">
            {config.rightDesktopImage ? (
              <Image
                src={config.rightDesktopImage}
                alt=""
                priority={variant === "leaderboard"}
                className={config.sideImageClassName}
              />
            ) : null}
          </div>
        </div>
        <div className="absolute inset-0 bg-linear-to-r from-surface/50 via-transparent to-surface/35" />
      </div>
    </section>
  );
}
