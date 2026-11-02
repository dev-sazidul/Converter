"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & {
  to: string;
};

export function Link({ to, ...props }: LinkProps) {
  return <NextLink href={to} {...props} />;
}

type NavLinkProps = Omit<LinkProps, "className"> & {
  end?: boolean;
  className?: string | ((state: { isActive: boolean }) => string);
};

export function NavLink({ to, end = false, className, ...props }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = end || to === "/" ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  const resolved = typeof className === "function" ? className({ isActive }) : className;
  return <NextLink href={to} className={resolved} {...props} />;
}
