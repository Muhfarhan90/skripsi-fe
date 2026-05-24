import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Pre-University LMS",
    short_name: "LMS",
    description: "Platform pembelajaran yang tetap siap dipasang dan dipakai pada koneksi yang tidak stabil.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    lang: "id-ID",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/app-icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/app-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Masuk",
        short_name: "Masuk",
        description: "Buka halaman login",
        url: "/login",
        icons: [{ src: "/app-icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Katalog Kursus",
        short_name: "Kursus",
        description: "Jelajahi katalog kursus",
        url: "/courses",
        icons: [{ src: "/app-icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
