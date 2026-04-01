import { useMemo } from 'react';
import pghSkyline from '../assets/pgh_skyline.png';

const pittsburghTaglines = [
  'Made in Pittsburgh. Deployed Everywhere.',
  'Built in the 412.',
  'PGH Built. Internet Ready.',
  'Crafted in Pittsburgh, Shipped to the Cloud.',
  'Forged in the Steel City, Powered by Wi-Fi.',
  'From the Three Rivers to Your Browser.',
  'Yinzer-Built, Pixel-Perfect.',
  'Pittsburgh Made. Beta-Tested.',
  'Made in PGH — No Bugs, Just Bridges.',
  'Steel City Code, Worldwide Mode.',
  '412 Crafted. API Attached.',
];

export default function Footer() {
  const tagline = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * pittsburghTaglines.length);
    return pittsburghTaglines[randomIndex];
  }, []);

  return (
    <footer className="border-t border-gray-200 bg-white py-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} SignUpSignIn. Simple event registration and check-in.
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <img src={pghSkyline} alt="Pittsburgh" className="h-4 w-auto opacity-40" />
          <span className="text-xs text-gray-400">{tagline}</span>
        </div>
      </div>
    </footer>
  );
}
