"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";

export default function PublicConversionLink({ eventName, onClick, ...props }) {
  function handleClick(event) {
    try {
      track(eventName);
    } catch {
      // Analytics must never interrupt navigation.
    }
    onClick?.(event);
  }

  return <Link {...props} onClick={handleClick} />;
}
