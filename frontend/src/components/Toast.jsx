export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 panel px-4 py-2 text-sm opacity-100 transition-opacity duration-300`}
    >
      {toast.text}
    </div>
  );
}
