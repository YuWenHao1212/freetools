"use client";

import { useState, useRef, useEffect } from "react";
import { Link, usePathname } from "@/i18n/navigation";

interface TextToolsDropdownProps {
  label: string;
  items: { href: string; label: string }[];
  active: boolean;
}

export default function TextToolsDropdown({
  label,
  items,
  active,
}: TextToolsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className={
          active
            ? "flex items-center gap-1 text-base font-semibold text-ink-900"
            : "flex items-center gap-1 text-base text-ink-600 hover:text-ink-900"
        }
      >
        {label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="3 4.5 6 7.5 9 4.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-48 rounded-lg border border-border bg-white py-1 shadow-lg">
          {items.map(({ href, label: itemLabel }) => {
            const isItemActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={
                  isItemActive
                    ? "block px-4 py-2 text-sm font-medium text-accent"
                    : "block px-4 py-2 text-sm text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                }
              >
                {itemLabel}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
