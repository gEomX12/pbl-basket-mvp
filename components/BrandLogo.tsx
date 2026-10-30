'use client';

import Image from 'next/image';
import Link from 'next/link';

const LOGO = '/logo.webp';

export default function BrandLogo({ onClick }: { onClick?: () => void }) {

  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="ПБЛ Павлодар — на главную"
      className="group flex shrink-0 items-center rounded-full outline-none"
    >
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface2 ring-1 ring-line transition-all duration-300 ease-in-out group-hover:ring-2 group-hover:ring-accent group-focus-visible:ring-2 group-focus-visible:ring-accent">
        <Image
          src={LOGO}
          alt=""
          width={40}
          height={40}
          priority
          className="h-full w-full object-contain transition-transform duration-300 ease-in-out group-hover:scale-110 group-focus-visible:scale-110"
        />
      </span>

      {/*
        Сетка 0fr → 1fr анимирует ширину без магических пиксельных значений:
        в покое блок схлопнут в ноль, при наведении плавно раскрывается.
      */}
      <span className="grid grid-cols-[0fr] transition-all duration-300 ease-in-out group-hover:ml-2.5 group-hover:grid-cols-[1fr] group-focus-visible:ml-2.5 group-focus-visible:grid-cols-[1fr]">
        <span className="overflow-hidden">
          <span className="block -translate-x-2 whitespace-nowrap leading-tight opacity-0 transition-all delay-75 duration-300 ease-in-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
            <span className="block text-base font-black tracking-tight text-accent">PBL</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              Павлодар
            </span>
          </span>
        </span>
      </span>
    </Link>
  );
}
