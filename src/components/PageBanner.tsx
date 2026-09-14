import type { ReactNode } from "react";
import HeroParallax from "@/components/HeroParallax";

/**
 * Фото-баннер раздела: атмосферное фото + ken-burns + параллакс,
 * двойное затемнение — текст под ним всегда читается.
 * Подписи разделов на английском (заголовок) + русский подзаголовок.
 */
export default function PageBanner({
  photo,
  title,
  subtitle,
  children,
}: {
  photo: string;
  title: ReactNode;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden">
      <HeroParallax>
        <div className="hero-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" fetchPriority="high" />
        </div>
      </HeroParallax>
      {/* Дополнительное затемнение: баннер короче hero, поэтому усиливаем шторки */}
      <div aria-hidden className="absolute inset-0 bg-[#0b0c10]/45" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 pb-14 pt-10 text-center sm:px-6 sm:pb-20 sm:pt-14">
        <p className="eyebrow !text-indigo-200">{subtitle}</p>
        <h1 className="text-glow max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
          {title}
        </h1>
        {children}
      </div>
    </section>
  );
}
