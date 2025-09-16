"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  reply?: string | null;
  createdAt: string;
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.045 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z" />
      </svg>
    ))}
  </div>
);

const ReplyForm = ({ review, onReplySubmitted }: { review: Review, onReplySubmitted: (reviewId: string, reply: string) => void }) => {
    const [reply, setReply] = useState(review.reply || '');
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`/api/reviews/${review.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reply }),
            });
            if (!res.ok) throw new Error('Failed to submit reply.');
            onReplySubmitted(review.id, reply);
            setIsEditing(false);
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (review.reply && !isEditing) {
        return (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="font-semibold">Your Reply:</p>
                <p className="text-gray-700 dark:text-gray-200">{review.reply}</p>
                <button onClick={() => setIsEditing(true)} className="text-sm text-blue-600 hover:underline mt-2">Edit Reply</button>
            </div>
        );
    }
    
    return (
        <form onSubmit={handleReply} className="mt-4">
            <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write your reply..."
                className="w-full border rounded-lg p-2 h-20"
                required
            />
            <div className="flex justify-end gap-2 mt-2">
                {isEditing && (
                    <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1 rounded-lg bg-gray-200 text-sm">Cancel</button>
                )}
                <button type="submit" className="px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Reply'}
                </button>
            </div>
        </form>
    );
};

export default function ManageReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    const detailerId = (session?.user as any)?.id;
    if (detailerId) {
      fetch(`/api/reviews?detailerId=${detailerId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
          } else {
            setReviews(data);
          }
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to fetch reviews.');
          setLoading(false);
        });
    }
  }, [session]);

  const handleReplySubmitted = (reviewId: string, reply: string) => {
    setReviews(prev =>
        prev.map(r => r.id === reviewId ? { ...r, reply } : r)
    );
  };
  
  if (loading) return <div className="text-center py-10">Loading reviews...</div>;
  if (error) return <div className="text-center py-10 text-red-600">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Manage Reviews</h1>
      <div className="space-y-6">
        {reviews.length === 0 ? (
          <div className="text-gray-500 text-center bg-white dark:bg-gray-800 rounded-xl shadow p-8">No reviews yet.</div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-lg">{review.authorName}</span>
                <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
              <div className="mb-2">
                <StarRating rating={review.rating} />
              </div>
              <p className="text-gray-700 dark:text-gray-200">{review.comment}</p>
              <ReplyForm review={review} onReplySubmitted={handleReplySubmitted} />
            </div>
          ))
        )}
      </div>
    </div>
  );
} 