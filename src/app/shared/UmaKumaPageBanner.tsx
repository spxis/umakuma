import Image, { type StaticImageData } from "next/image";

import adminBanner from "@/images/umakuma-banner2.png";
import leaderboardHero from "@/images/umakuma-hero1.png";
import userBanner from "@/images/umakuma-banner1.png";

type UmaKumaPageBannerVariant = "leaderboard" | "user" | "admin";

type UmaKumaPageBannerProps = {
  variant: UmaKumaPageBannerVariant;
  className?: string;
};

const BANNER_IMAGE_BY_VARIANT: Record<UmaKumaPageBannerVariant, StaticImageData> = {
  leaderboard: leaderboardHero,
  user: userBanner,
  admin: adminBanner,
};

export default function UmaKumaPageBanner({ variant, className }: UmaKumaPageBannerProps) {
  return (
    <section
      aria-hidden="true"
      className={`overflow-hidden rounded-2xl border border-line/80 bg-surface/80 shadow-[0_18px_40px_rgba(8,16,36,0.12)] ${className ?? ""}`}
    >
      <div className="relative h-24 sm:h-32 lg:h-40">
        <Image
          src={BANNER_IMAGE_BY_VARIANT[variant]}
          alt=""
          fill
          priority={variant === "leaderboard"}
          className="object-cover object-center"
          sizes="(min-width: 1024px) 1200px, 100vw"
        />
        <div className="absolute inset-0 bg-linear-to-r from-surface/50 via-transparent to-surface/35" />
      </div>
    </section>
  );
}
