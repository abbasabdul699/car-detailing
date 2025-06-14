"use client";
import { useState } from "react";

const mockReviews = [
  {
    id: 1,
    name: "John Doe",
    rating: 5,
    review: "Amazing service! My car looks brand new.",
    date: "2024-06-01",
  },
  {
    id: 2,
    name: "Jane Smith",
    rating: 4,
    review: "Great attention to detail. Will book again.",
    date: "2024-05-28",
  },
  {
    id: 3,
    name: "Alex Johnson",
    rating: 3,
    review: "Good, but could be faster.",
    date: "2024-05-20",
  },
];

export default function ManageReviewsPage() {
  const [reviews, setReviews] = useState(mockReviews);

  const handleDelete = (id: number) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto py-10 bg-white dark:bg-gray-900 rounded-xl shadow p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Manage Reviews</h1>
      <div className="space-y-6">
        {reviews.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center">No reviews yet.</div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{review.name}</span>
                  <span className="text-xs text-gray-400">{review.date}</span>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.045 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-200 mb-2">{review.review}</p>
              </div>
              <button
                onClick={() => handleDelete(review.id)}
                className="self-start md:self-center px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 