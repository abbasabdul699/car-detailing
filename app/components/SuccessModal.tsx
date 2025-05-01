interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SuccessModal({ isOpen, onClose }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
        <p className="text-gray-600 mb-6">
          Your information has been submitted. A team-member from Reeva will reach out to you soon!
        </p>
        <button
          onClick={onClose}
          className="bg-[#0A2217] text-white px-8 py-2 rounded-xl hover:bg-[#0A2217]/90 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
} 