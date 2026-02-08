"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";

interface NavLink {
  href: string;
  label: string;
  active?: boolean;
  subItems?: { href: string; label: string }[];
}

interface MobileNavProps {
  navLinks: NavLink[];
}

export default function MobileNav({ navLinks }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        className="flex h-10 w-10 items-center justify-center rounded-md text-ink-600 hover:text-ink-900"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </>
          )}
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 top-[57px] z-40 bg-black/20"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <nav className="fixed left-0 right-0 top-[57px] z-50 border-b border-border bg-white px-6 py-4">
            <ul className="flex flex-col gap-1">
              {navLinks.map(({ href, label, active, subItems }) => (
                <li key={label}>
                  {subItems ? (
                    <div>
                      <span
                        className={
                          active
                            ? "block rounded-md px-3 py-2.5 text-sm font-semibold text-ink-900 bg-ink-50"
                            : "block rounded-md px-3 py-2.5 text-sm text-ink-600"
                        }
                      >
                        {label}
                      </span>
                      <ul className="ml-3 mt-1 flex flex-col gap-1">
                        {subItems.map((sub) => {
                          const isSubActive = pathname === sub.href;
                          return (
                            <li key={sub.href}>
                              <Link
                                href={sub.href}
                                className={
                                  isSubActive
                                    ? "block rounded-md px-3 py-2 text-sm font-medium text-accent"
                                    : "block rounded-md px-3 py-2 text-sm text-ink-500 hover:bg-ink-50 hover:text-ink-900"
                                }
                              >
                                {sub.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : (
                    <Link
                      href={href}
                      className={
                        active
                          ? "block rounded-md px-3 py-2.5 text-sm font-semibold text-ink-900 bg-ink-50"
                          : "block rounded-md px-3 py-2.5 text-sm text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                      }
                    >
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-border pt-4 px-3">
              <LocaleSwitcher />
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
