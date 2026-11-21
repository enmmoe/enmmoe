import React from 'react';

export const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div aria-hidden="true" className={`ios-skeleton rounded-xl ${className}`} />
);

export const HeroBannerSkeleton: React.FC = () => (
  <div className="px-4 pt-2 pb-2">
    <div className="w-full rounded-[20px] aspect-[3/4] sm:aspect-[16/9] max-h-[480px] ios-skeleton" />
  </div>
);

export const BookCardSkeleton: React.FC<{ horizontal?: boolean }> = ({ horizontal = false }) => (
  <div className={horizontal ? 'w-[146px] sm:w-[164px] shrink-0' : 'w-full'}>
    <div className="aspect-[2/3] rounded-[14px] ios-skeleton mb-2.5" />
    <div className="h-4 w-4/5 rounded-md ios-skeleton mb-1.5" />
    <div className="h-3 w-3/5 rounded-md ios-skeleton" />
  </div>
);

export const ConversationRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-4 py-3">
    <div className="w-12 h-12 rounded-full ios-skeleton shrink-0" />
    <div className="flex-1 space-y-2 min-w-0">
      <div className="flex items-center justify-between gap-4">
        <div className="h-4 w-32 rounded-md ios-skeleton" />
        <div className="h-3 w-10 rounded-md ios-skeleton" />
      </div>
      <div className="h-3.5 w-3/4 rounded-md ios-skeleton" />
    </div>
  </div>
);

export const HomeFeedSkeleton: React.FC = () => (
  <div className="space-y-8 pb-8">
    <HeroBannerSkeleton />
    <div className="space-y-3">
      <div className="px-4 flex items-center justify-between">
        <div className="h-6 w-40 rounded-lg ios-skeleton" />
        <div className="h-4 w-16 rounded-md ios-skeleton" />
      </div>
      <div className="px-4 flex gap-3.5 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <BookCardSkeleton key={i} horizontal />
        ))}
      </div>
    </div>
    <div className="space-y-3">
      <div className="px-4 flex items-center justify-between">
        <div className="h-6 w-36 rounded-lg ios-skeleton" />
      </div>
      <div className="px-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <BookCardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

export const SearchSkeleton: React.FC = () => (
  <div className="space-y-5 pt-2">
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="w-12 h-16 rounded-xl ios-skeleton shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-44 rounded-md ios-skeleton" />
            <div className="h-3 w-28 rounded-md ios-skeleton" />
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const ProfileSkeleton: React.FC = () => (
  <div className="px-4 py-6 space-y-6">
    <div className="flex flex-col items-center text-center gap-3">
      <div className="w-24 h-24 rounded-full ios-skeleton" />
      <div className="h-7 w-40 rounded-lg ios-skeleton" />
      <div className="h-4 w-28 rounded-md ios-skeleton" />
      <div className="h-10 w-64 rounded-xl ios-skeleton" />
    </div>
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  </div>
);
