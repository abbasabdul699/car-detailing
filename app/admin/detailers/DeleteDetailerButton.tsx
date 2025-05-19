"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteDetailerButton({ detailerId }: { detailerId: string }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this detailer? This cannot be undone.")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/detailers/${detailerId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete detailer");
        setDeleting(false);
        return;
      }
      // Refresh the page to update the list
      router.refresh();
    } catch (err) {
      setError("Failed to delete detailer");
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </>
  );
} 