import { useEffect, useMemo, useState } from 'react';
import type { CarouselApi } from '@/components/ui/carousel';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ImageIcon, Maximize2, Star } from 'lucide-react';

export interface AdImage {
  id: string;
  image_url: string;
  sort_order?: number;
}

interface AdImageGalleryProps {
  title: string;
  images: AdImage[];
  isFeatured?: boolean;
  className?: string;
}

export function AdImageGallery({
  title,
  images,
  isFeatured = false,
  className,
}: AdImageGalleryProps) {
  const sortedImages = useMemo(() => {
    return [...(images || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [images]);

  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!api) return;
    const update = () => setActiveIndex(api.selectedScrollSnap());
    update();
    api.on('select', update);
    api.on('reInit', update);
    return () => {
      api.off('select', update);
      api.off('reInit', update);
    };
  }, [api]);

  // Reset index when images change
  useEffect(() => {
    setActiveIndex(0);
    api?.scrollTo(0);
  }, [sortedImages.length, api]);

  if (!sortedImages.length) {
    return (
      <div className={cn('rounded-xl border bg-muted/30', className)}>
        <div className="aspect-[4/3] flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageIcon className="h-8 w-8" />
          <p className="text-sm">No photos uploaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative rounded-xl border bg-muted/30 overflow-hidden">
        <Carousel
          setApi={setApi}
          opts={{ align: 'center', loop: sortedImages.length > 1 }}
          className="w-full"
        >
          <CarouselContent>
            {sortedImages.map((img, idx) => (
              <CarouselItem key={img.id}>
                <div className="relative aspect-[4/3] w-full">
                  <img
                    src={img.image_url}
                    alt={`${title} - photo ${idx + 1}`}
                    className="absolute inset-0 h-full w-full object-contain"
                    loading={idx === 0 ? 'eager' : 'lazy'}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {sortedImages.length > 1 && (
            <>
              <CarouselPrevious className="left-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background" />
              <CarouselNext className="right-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background" />
            </>
          )}
        </Carousel>

        {/* Top overlay */}
        <div className="absolute left-3 top-3 flex gap-2">
          {isFeatured && (
            <Badge className="gap-1">
              <Star className="h-3.5 w-3.5" />
              Featured
            </Badge>
          )}
          <Badge variant="secondary">
            {activeIndex + 1}/{sortedImages.length}
          </Badge>
        </div>

        {/* Lightbox trigger */}
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute right-3 top-3 gap-2 bg-background/80 hover:bg-background"
              aria-label="Open photo viewer"
            >
              <Maximize2 className="h-4 w-4" />
              <span className="hidden sm:inline">View</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl p-0 overflow-hidden">
            <div className="bg-background">
              <div className="p-3 border-b flex items-center justify-between">
                <p className="font-semibold truncate">{title}</p>
                <Badge variant="secondary">{activeIndex + 1}/{sortedImages.length}</Badge>
              </div>
              {/* Remount carousel when opening so startIndex matches */}
              <div className="p-4">
                <Carousel
                  key={`${lightboxOpen}-${activeIndex}`}
                  opts={{ align: 'center', loop: sortedImages.length > 1, startIndex: activeIndex }}
                >
                  <CarouselContent>
                    {sortedImages.map((img, idx) => (
                      <CarouselItem key={`${img.id}-lb`}>
                        <div className="relative aspect-[16/10] w-full">
                          <img
                            src={img.image_url}
                            alt={`${title} - photo ${idx + 1}`}
                            className="absolute inset-0 h-full w-full object-contain"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>

                  {sortedImages.length > 1 && (
                    <>
                      <CarouselPrevious className="left-5 top-1/2 -translate-y-1/2" />
                      <CarouselNext className="right-5 top-1/2 -translate-y-1/2" />
                    </>
                  )}
                </Carousel>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Thumbnails */}
      {sortedImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sortedImages.map((img, idx) => (
            <button
              key={`${img.id}-thumb`}
              type="button"
              onClick={() => api?.scrollTo(idx)}
              className={cn(
                'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border bg-muted/20',
                idx === activeIndex ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-80 hover:opacity-100'
              )}
              aria-label={`View photo ${idx + 1}`}
            >
              <img src={img.image_url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
