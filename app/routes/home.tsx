import type { Route } from "./+types/home";
import { Epure } from "~/epure/epure";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Epure Generator" },
    { name: "description", content: "Génerer une épure" },
  ];
}

export default function Home() {
  return <Epure />;
}
