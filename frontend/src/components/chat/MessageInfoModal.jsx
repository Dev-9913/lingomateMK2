import { X, Check, CheckCircle } from 'lucide-react';

export default function MessageInfoModal({ isOpen, onClose, message }) {
  if (!isOpen || !message) return null;

  // Helper for formatting time/date
  const fmtDate = date =>
    new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  const fmtTime = date =>
    new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  // Determine which status rows to show
  const showDelivered = ['DELIVERED', 'READ'].includes(message.status);
  const showRead = message.status === 'READ';

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-96">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Message Information</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="text-white rounded-2xl p-3 mb-4" style={{ backgroundColor: '#6852D6' }}>
          {message.mediaUrl ? (
            <div>
              {message.mediaType === 'IMAGE' && (
                <img
                  src={message.mediaUrl}
                  alt="Attachment"
                  className="rounded-xl w-full mb-2"
                />
              )}
              {message.mediaType === 'VIDEO' && (
                <video
                  src={message.mediaUrl}
                  className="rounded-xl w-full mb-2"
                  controls
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>
          ) : (
            <p>{message.text}</p>
          )}
          <div className="text-xs mt-1 flex items-center justify-end gap-1">
            <span>{fmtTime(message.createdAt)}</span>
            {/* Status icon: ✓ = sent, ✓✓ = delivered or read */}
            {message.status === 'READ' ? (
              <CheckCircle className="w-4 h-4 text-blue-400" />
            ) : message.status === 'DELIVERED' ? (
              <CheckCircle className="w-4 h-4 text-gray-400" />
            ) : (
              <Check className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Message Status Info */}
        <div className="space-y-3">
          {/* Sent */}
          <div>
            <h4 className="font-semibold text-gray-700">Sent</h4>
            <p className="text-sm text-gray-500">
              {fmtDate(message.createdAt)}, {fmtTime(message.createdAt)}
            </p>
          </div>

          {/* Delivered */}
          {showDelivered && (
            <div>
              <h4 className="font-semibold text-gray-700">Delivered</h4>
              <p className="text-sm text-gray-500">
                {/* fallback to updatedAt */}
                {fmtDate(message.updatedAt)}, {fmtTime(message.updatedAt)}
              </p>
            </div>
          )}

          {/* Read */}
          {showRead && (
            <div>
              <h4 className="font-semibold text-gray-700">Read</h4>
              <p className="text-sm text-gray-500">
                {fmtDate(message.updatedAt)}, {fmtTime(message.updatedAt)}
              </p>
            </div>
          )}
        </div>
      </div>

      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button type="button">close</button>
      </form>
    </dialog>
  );
}
