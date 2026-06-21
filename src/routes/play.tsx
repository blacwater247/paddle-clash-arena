import { createFileRoute } from "@tanstack/react-router";
import PaddleClashArena from "@/components/PaddleClashArena";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play — Paddle Clash Arena" },
      { name: "description", content: "Jump into Paddle Clash Arena. Power-ups, super powers, boss matches, local 2-player. First to 7 wins." },
      { property: "og:title", content: "Play Paddle Clash Arena" },
      { property: "og:description", content: "Power-ups, super powers, boss matches, local 2-player." },
      { property: "og:url", content: "https://paddle-clash-arena.lovable.app/play" },
    ],
    links: [{ rel: "canonical", href: "https://paddle-clash-arena.lovable.app/play" }],
  }),
  component: PaddleClashArena,
});
