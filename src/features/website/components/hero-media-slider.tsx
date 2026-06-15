"use client";

import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

export interface HeroMediaSlide {
  id: string;
  imageUrl: string | null;
  title: string;
  eyebrow?: string | null;
  description?: string | null;
  href?: string | null;
  hrefLabel?: string | null;
}

interface HeroMediaSliderProps {
  slides: HeroMediaSlide[];
  siteName: string;
}

export function HeroMediaSlider({ slides, siteName }: HeroMediaSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasSlides = slides.length > 0;
  const canSlide = slides.length > 1;
  const displayIndex = hasSlides ? activeIndex % slides.length : 0;

  useEffect(() => {
    if (!canSlide) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [canSlide, slides.length]);

  const handlePrevious = () => {
    if (!hasSlides) {
      return;
    }

    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    if (!hasSlides) {
      return;
    }

    setActiveIndex((current) => (current + 1) % slides.length);
  };

  return (
    <div className="rounded-[2rem] border border-white/70 bg-white/65 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-4">
      <div className="relative overflow-hidden rounded-[1.65rem] border border-white/50 bg-[var(--primary)]/10">


        {hasSlides ? (
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${displayIndex * 100}%)` }}
          >
            {slides.map((slide) => (
              <article key={slide.id} className="relative w-full shrink-0">
                {slide.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slide.imageUrl}
                    alt={slide.title || siteName}
                    className="aspect-[4/5] w-full object-cover sm:aspect-[16/14]"
                  />
                ) : (
                  <div className="flex aspect-[4/5] w-full items-center justify-center sm:aspect-[16/14]">
                    <BookOpen className="size-16 text-[var(--primary)]/35" />
                  </div>
                )}


              </article>
            ))}
          </div>
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center sm:aspect-[16/14]">
            <BookOpen className="size-16 text-[var(--primary)]/35" />
          </div>
        )}

        {canSlide ? (
          <>
            <div className="absolute inset-x-0 top-4 z-20 flex justify-between px-4 sm:px-5">
              <button
                type="button"
                onClick={handlePrevious}
                className="inline-flex size-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/40 text-white backdrop-blur transition hover:bg-slate-950/60"
                aria-label="Slide sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex size-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/40 text-white backdrop-blur transition hover:bg-slate-950/60"
                aria-label="Slide berikutnya"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2 px-4 sm:bottom-5">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={[
                    "h-2.5 rounded-full transition",
                    index === displayIndex ? "w-8 bg-white" : "w-2.5 bg-white/45 hover:bg-white/70",
                  ].join(" ")}
                  aria-label={`Buka slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
