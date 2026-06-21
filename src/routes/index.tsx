import { createFileRoute } from "@tanstack/react-router";
import PaddleClashArena from "@/components/PaddleClashArena";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paddle Clash Arena — Fast Arcade Table Tennis" },
      { name: "description", content: "Play Paddle Clash Arena: a fast-paced arcade table tennis game with power-ups, boss matches, and local 2-player mode. Beat the AI to 7 points." },
      { property: "og:title", content: "Paddle Clash Arena — Play Fast Arcade Table Tennis" },
      { property: "og:description", content: "Power-ups, boss matches, and local 2-player mode. Beat the AI to 7 points." },
      { property: "og:url", content: "https://paddle-clash-arena.lovable.app/" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Paddle Clash Arena — Play Fast Arcade Table Tennis" },
      { name: "twitter:description", content: "Power-ups, boss matches, and local 2-player mode. Beat the AI to 7 points." },
    ],
    links: [{ rel: "canonical", href: "https://paddle-clash-arena.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: "Paddle Clash Arena",
          description: "Fast-paced arcade table tennis with power-ups, boss matches, and local 2-player mode.",
          genre: ["SportsGame", "Arcade"],
          gamePlatform: ["Web Browser", "iOS"],
          applicationCategory: "Game",
          operatingSystem: "Any",
          url: "https://paddle-clash-arena.lovable.app/",
        }),
      },
    ],
  }),
  component: PaddleClashArena,
});
