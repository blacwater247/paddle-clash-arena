import { createFileRoute } from "@tanstack/react-router";
import PaddleClashArena from "@/components/PaddleClashArena";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paddle Clash Arena — Fast Arcade Table Tennis" },
      { name: "description", content: "Fast-paced arcade table tennis. Beat the AI to 7 points in Paddle Clash Arena." },
      { property: "og:title", content: "Paddle Clash Arena" },
      { property: "og:description", content: "Fast-paced arcade table tennis. Beat the AI to 7 points." },
    ],
  }),
  component: PaddleClashArena,
});
