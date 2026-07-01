import { Star, StarHalf } from "lucide-react";

export function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 && rating - full < 0.75;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(<Star key={i} size={size} className="fill-amber-400 text-amber-400" />);
    } else if (i === full && half) {
      stars.push(
        <span key={i} className="relative inline-flex">
          <Star size={size} className="text-zinc-700" />
          <StarHalf size={size} className="absolute left-0 fill-amber-400 text-amber-400" />
        </span>
      );
    } else {
      stars.push(<Star key={i} size={size} className="text-zinc-700" />);
    }
  }
  return <span className="inline-flex items-center gap-0.5">{stars}</span>;
}
