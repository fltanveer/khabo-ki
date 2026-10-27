import Image from "next/image";

// The app's one character: a three-tier tiffin carrier, the thing lunch arrives
// in. It has a job, not a cameo — it hosts the screens where there's nothing
// to act on (no menu yet, ordering closed, nothing to show) and nudges when a
// pick is still missing. All three moods come from one illustration so they
// read as the same object.

// "party" swaps the lunch box for a celebrating handi — parties are not
// everyday lunch, so they get their own object in the same drawing style.
type Mood = "happy" | "waiting" | "sleepy" | "party";

const ART: Record<Mood, { src: string; width: number; height: number }> = {
  happy: { src: "/brand/tiffin-happy.png", width: 384, height: 643 },
  waiting: { src: "/brand/tiffin-waiting.png", width: 384, height: 643 },
  sleepy: { src: "/brand/tiffin-sleepy.png", width: 384, height: 507 },
  party: { src: "/brand/party-handi.png", width: 420, height: 355 },
};

export function Tiffin({
  mood = "happy",
  className = "h-24 w-24",
}: {
  mood?: Mood;
  className?: string;
}) {
  const art = ART[mood];
  return (
    <Image
      src={art.src}
      width={art.width}
      height={art.height}
      alt=""
      aria-hidden="true"
      className={`object-contain ${className}`}
    />
  );
}

// The wordmark: chunky lettering with a fried egg standing in for the "o".
// The lettering is artwork, so there is one file per theme; CSS in
// globals.css shows whichever matches data-theme.
export function Logo({ alt, className = "h-9 w-auto" }: { alt: string; className?: string }) {
  return (
    <>
      <Image
        src="/brand/wordmark-egg-light.png"
        width={720}
        height={178}
        alt={alt}
        priority
        className={`logo-light ${className}`}
      />
      <Image
        src="/brand/wordmark-egg-dark.png"
        width={720}
        height={178}
        alt={alt}
        priority
        className={`logo-dark ${className}`}
      />
    </>
  );
}
