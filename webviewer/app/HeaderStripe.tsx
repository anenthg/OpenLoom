"use client";

import { useEffect, useState } from "react";

export default function HeaderStripe() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="stripe-divider"
      style={{
        opacity: visible ? 0.35 : 0,
        transition: "opacity 0.3s ease",
      }}
    />
  );
}
