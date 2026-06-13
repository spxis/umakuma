import Image, { type StaticImageData } from "next/image";

import adminBanner from "@/images/umakuma-banner2.png";
import leaderboardHero from "@/images/umakuma-hero1.png";
import userBanner from "@/images/umakuma-banner1.png";

type UmaKumaPageBannerVariant = "leaderboard" | "user" | "admin";

type UmaKumaPageBannerProps = {
  variant: UmaKumaPageBannerVariant;
  className?: string;
};

type BannerConfig = {
  image: StaticImageData;
  frameClassName: string;
  imageClassName: string;
};

const BANNER_CONFIG_BY_VARIANT: Record<UmaKumaPageBannerVariant, BannerConfig> = {
  leaderboard: {
    image: leaderboardHero,
    frameClassName: "h-28 sm:h-36 lg:h-44",
    imageClassName: "object-contain object-center p-1 sm:p-2",
  },
  user: {
    image: userBanner,
    frameClassName: "h-24 sm:h-32 lg:h-40",
    imageClassName: "object-contain object-center p-1 sm:p-2",
  },
  admin: {
    image: adminBanner,
    frameClassName: "h-24 sm:h-32 lg:h-40",
    imageClassName: "object-contain object-center p-1 sm:p-2",
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
        <Image
          src={config.image}
          alt=""
          fill
          priority={variant === "leaderboard"}
          className={config.imageClassName}
          sizes="(min-width: 1024px) 1200px, 100vw"
        />
        <div className="absolute inset-0 bg-linear-to-r from-surface/50 via-transparent to-surface/35" />
      </div>
    </section>
  );
}
