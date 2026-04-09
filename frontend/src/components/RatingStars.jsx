export default function RatingStars({ rating = 0, count = 0, size = 'sm' }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<i key={i} className="fas fa-star text-yellow-400" />);
    } else if (i === fullStars && hasHalf) {
      stars.push(<i key={i} className="fas fa-star-half-alt text-yellow-400" />);
    } else {
      stars.push(<i key={i} className="far fa-star text-gray-300" />);
    }
  }

  return (
    <div className={`flex items-center gap-1 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      <div className="flex gap-0.5">{stars}</div>
      <span className="text-gray-500 ml-1">
        {rating > 0 ? rating.toFixed(1) : '0.0'}
        {count > 0 && <span className="text-gray-400"> ({count})</span>}
      </span>
    </div>
  );
}
