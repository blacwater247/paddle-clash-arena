import { createFileRoute } from "@tanstack/react-router";
import LandingPage from "@/components/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paddle Clash Arena — Pro Arcade Table Tennis with Super Powers" },
      { name: "description", content: "Fast-paced arcade table tennis. Super powers, boss battles, 8+ arenas, local 2-player, and an original soundtrack. Free in your browser." },
      { property: "og:title", content: "Paddle Clash Arena — Pro Arcade Table Tennis" },
      { property: "og:description", content: "Super powers, boss battles, 8+ arenas, original soundtrack. Free to play." },
      { property: "og:url", content: "https://paddle-clash-arena.lovable.app/" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Paddle Clash Arena — Pro Arcade Table Tennis" },
      { name: "twitter:description", content: "Super powers, boss battles, 8+ arenas, original soundtrack." },
    ],
    links: [{ rel: "canonical", href: "https://paddle-clash-arena.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: "Paddle Clash Arena",
          description: "Fast-paced arcade table tennis with super powers, boss battles, and an original soundtrack.",
          genre: ["SportsGame", "Arcade"],
          gamePlatform: ["Web Browser", "iOS"],
          applicationCategory: "Game",
          operatingSystem: "Any",
          url: "https://paddle-clash-arena.lovable.app/",
        }),
      },
    ],
  }),
  component: LandingPage,
});
