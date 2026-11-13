/**
 * DVI_AGENT_ADS_FULL_IMAGE_V2
 * Agent dashboard welcome banner only. Published advertisements are preloaded
 * before display; the original six-state slideshow remains the fallback.
 */
import { useEffect, useState } from 'react';
import { ExternalLink, Megaphone } from 'lucide-react';
import { AgentDashboardSlideshow } from './AgentDashboardSlideshow';
import {
  agentAdImageUrl,
  listPublishedAgentDashboardAds,
  type AgentDashboardAd,
} from '@/services/agentDashboardAds';
import './agent-advertisement-slideshow.css';

function PublishedAdvertisementSlideshow({ ads }: { ads: AgentDashboardAd[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setCurrent(0);
  }, [ads]);

  useEffect(() => {
    if (ads.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timerId = window.setInterval(() => {
      if (!document.hidden) setCurrent((previous) => (previous + 1) % ads.length);
    }, 5000);
    return () => window.clearInterval(timerId);
  }, [ads.length]);

  const active = ads[current] ?? ads[0];
  if (!active) return null;
  const link = /^https:\/\//i.test(active.targetUrl || '') ? active.targetUrl : null;

  return (
    <div className="dvi-agent-hero-slideshow" aria-label={`Advertisement: ${active.title}`}>
      <div className="dvi-agent-hero-slideshow-images" aria-hidden="true">
        {ads.map((ad, index) => {
          const imageUrl = agentAdImageUrl(ad.imagePath);
          return (
            <div
              key={ad.id}
              className={`dvi-agent-ad-slide${index === current ? ' is-current' : ''}`}
            >
              <img className="dvi-agent-ad-backdrop" src={imageUrl} alt="" draggable={false} aria-hidden="true" decoding="async" />
              <img className="dvi-agent-ad-foreground" src={imageUrl} alt="" draggable={false} decoding="async" />
            </div>
          );
        })}
      </div>
      <div className="dvi-agent-hero-slideshow-wash" aria-hidden="true" />
      <div className="dvi-agent-hero-state-pill dvi-agent-sponsored-pill">
        <Megaphone size={15} aria-hidden="true" />
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="dvi-agent-hero-ad-link"
            aria-label={`Sponsored: ${active.title}. Open offer in a new tab`}
          >
            <span>Sponsored · {active.title}</span>
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ) : (
          <span>Sponsored · {active.title}</span>
        )}
      </div>
    </div>
  );
}

function preloadPublishedImages(ads: AgentDashboardAd[]): Promise<AgentDashboardAd[]> {
  return Promise.all(
    ads.map(
      (ad) => new Promise<AgentDashboardAd | null>((resolve) => {
        const source = agentAdImageUrl(ad.imagePath);
        if (!ad.enabled || !source) { resolve(null); return; }
        const testImage = new Image();
        testImage.onload = () => resolve(testImage.naturalWidth > 0 ? ad : null);
        testImage.onerror = () => resolve(null);
        testImage.src = source;
      }),
    ),
  ).then((loaded) => loaded.filter((ad): ad is AgentDashboardAd => ad !== null));
}

export function AgentAdvertisementSlideshow() {
  const [publishedAds, setPublishedAds] = useState<AgentDashboardAd[] | null>(null);

  useEffect(() => {
    let mounted = true;
    void listPublishedAgentDashboardAds()
      .then(preloadPublishedImages)
      .then((ads) => {
        if (mounted) setPublishedAds(ads);
      })
      .catch((error: unknown) => {
        console.warn('[AgentDashboard] Advertisement API unavailable; original slideshow preserved.', error);
        if (mounted) setPublishedAds([]);
      });
    return () => { mounted = false; };
  }, []);

  if (!publishedAds?.length) return <AgentDashboardSlideshow />;
  return <PublishedAdvertisementSlideshow ads={publishedAds} />;
}
