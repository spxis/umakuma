import Image, { type StaticImageData } from "next/image";

import adminBanner from "@/images/umakuma-hero2-transparent.png";
import leaderboardHero from "@/images/umakuma-hero1-transparent.png";
import kumaClose from "@/images/kuma-close-transparent.png";
import umaClose from "@/images/uma-close-transparent.png";
import umaKumaLeft from "@/images/umakuma-1.png";
import umaKumaRight from "@/images/umakuma-2.png";
import userBanner from "@/images/umakuma-banner1-transparent.png";

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
  centerImageFrameClassName: string;
  sideImageClassName?: string;
};

const BANNER_CONFIG_BY_VARIANT: Record<UmaKumaPageBannerVariant, BannerConfig> = {
  leaderboard: {
    centerImage: leaderboardHero,
    leftDesktopImage: umaClose,
    rightDesktopImage: kumaClose,
    frameClassName: "h-28 sm:h-36 lg:h-44",
    centerImageFrameClassName: "h-16 w-56 sm:h-20 sm:w-72 lg:h-24 lg:w-[420px]",
    sideImageClassName: "h-16 w-auto lg:h-24 xl:h-28",
  },
  user: {
    centerImage: userBanner,
    leftDesktopImage: umaKumaLeft,
    rightDesktopImage: umaKumaRight,
    frameClassName: "h-24 sm:h-32 lg:h-40",
    centerImageFrameClassName: "h-14 w-40 sm:h-16 sm:w-52 lg:h-20 lg:w-64",
    sideImageClassName: "h-16 w-auto lg:h-24 xl:h-28",
  },
  admin: {
    centerImage: adminBanner,
    frameClassName: "h-24 sm:h-32 lg:h-40",
    centerImageFrameClassName: "h-14 w-40 sm:h-16 sm:w-52 lg:h-20 lg:w-64",
  },
};

export default function UmaKumaPageBanner({ variant, className }: UmaKumaPageBannerProps) {
  const config = BANNER_CONFIG_BY_VARIANT[variant];

  return (
    <section
      aria-hidden="true"
      className={`overflow-hidden rounded-2xl border border-white bg-white ${className ?? ""}`}
    >
      <div className={`relative ${config.frameClassName}`}>
        <div className="grid h-full grid-cols-1 items-center md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="hidden h-full items-center justify-start pl-3 md:flex lg:pl-4">
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
              <div className={`relative overflow-hidden bg-white ${config.centerImageFrameClassName}`}>
                <Image
                  src={config.centerImage}
                  alt=""
                  fill
                  priority={variant === "leaderboard"}
                  className="h-full w-full"
                  style={{ objectFit: "contain", objectPosition: "center" }}
                  sizes="(min-width: 1024px) 420px, 256px"
                />
              </div>
          </div>
          <div className="hidden h-full items-center justify-end pr-3 md:flex lg:pr-4">
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
      </div>
    </section>
  );
}
