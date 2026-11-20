"use client";

import { useState } from "react";
import { useApp } from "../app/providers";
import { t } from "../lib/guide/ui";

/**
 * Nothing is requested from YouTube until the visitor taps. Then it opens the privacy-enhanced player.
 * With no connection, only the link is shown.
 */
export function VideoTile({ videoId, title }: { videoId: string; title: string }) {
  const { prefs, online } = useApp();
  const [on, setOn] = useState(false);
  if (!online) return null;
  return (
    <div className="vid-frame">
      {on
        ? <iframe src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        : <button type="button" className="vid-tap" onClick={() => setOn(true)}><span className="play" aria-hidden="true">▶</span><span>{t(prefs.lang, "cd.tap")}</span></button>}
    </div>
  );
}
