import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

export default function AuthPrompt({ onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current.querySelector("button").focus();
    const handleKey = event => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key === "Tab") {
        const items = [...dialog.current.querySelectorAll("a, button")];
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-darkBg/90 p-6">
      <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="guest-publish-title" className="w-full max-w-md border border-primary bg-darkBg p-8 text-white">
        <h2 id="guest-publish-title" className="text-2xl font-serif text-primary">Share your own stories</h2>
        <p className="mt-4">Create an account to publish your own posts. You can keep reading and searching as a guest.</p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link to="/register" state={{ from: "/write" }} className="bg-primary px-4 py-2 text-darkBg">Sign up</Link>
          <Link to="/login" state={{ from: "/write" }} className="border border-primary px-4 py-2 text-primary">Sign in</Link>
        </div>
        <button type="button" onClick={onClose} className="mt-6 underline">Keep browsing</button>
      </section>
    </div>
  );
}
