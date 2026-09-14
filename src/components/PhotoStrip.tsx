import HeroParallax from "@/components/HeroParallax";

/**
 * Декоративная фото-полоса в потоке страницы: узкая панорама с параллаксом
 * и сильным затемнением (текст поверх не размещается, читать нечего —
 * фото просто задаёт ритм раздела, как на главной).
 */
export default function PhotoStrip({
  photo,
  alt,
  caption,
}: {
  photo: string;
  alt: string;
  caption?: string;
}) {
  return (
    <div className="relative overflow-hidden">
      <HeroParallax>
        <div className="hero-photo static">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={alt} loading="lazy" decoding="async" />
        </div>
      </HeroParallax>
      <div aria-hidden className="absolute inset-0 bg-[#0b0c10]/60" />
      {caption ? (
        <p className="relative mx-auto max-w-6xl px-4 py-8 text-center text-xs uppercase tracking-[0.3em] text-zinc-300 sm:px-6 sm:py-10">
          {caption}
        </p>
      ) : (
        <div className="relative h-24 sm:h-32" />
      )}
    </div>
  );
}
