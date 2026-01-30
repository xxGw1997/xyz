import { createFileRoute } from "@tanstack/react-router";

import { ProjectCard } from "@/components/project-card";
import { SocialLinks } from "@/components/social-links";

export const Route = createFileRoute("/")({
  component: Index,
});

const projects = [
  {
    title: "A Chat App build on cloudflare worker",
    description: "A chat application, Login your account to explore",
    href: "/chat",
    tags: ["Websocket", "Durable objects", "Hono"],
    year: "2026",
  },
  {
    title: "🥕   真棒！",
    description: "聪明的小猫能听懂人说的话，你也来试试吧~",
    href: "/real-good",
    tags: ["motion/react", "AI generate image", "Cloudflare Worker"],
    year: "2025",
  },
  {
    title: "Awesome Display Card",
    description: "精致的信息展示卡片",
    href: "/profile-card",
    tags: ["React", "Tailwind CSS", "TypeScript"],
    year: "2025",
  },
];

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto py-16 md:py-24">
        {/* Header */}
        <header className="mb-16 md:mb-24">
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            zz Labs
          </h1>
          <p className="text-muted-foreground leading-relaxed text-pretty max-w-xl">
            <span className="italic text-foreground/80">探索创意与技术。</span>{" "}
            这里是我的个人实验室，记录着对设计与开发的持续探索。每个项目都是一次尝试，
            将想法转化为可交互的体验。
          </p>
          <div className="mt-6">
            <SocialLinks />
          </div>
        </header>

        {/* Projects Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              实验项目
            </h2>
            <span className="text-xs text-muted-foreground/60">
              {projects.length} 个项目
            </span>
          </div>

          <div className="grid gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.title}
                title={project.title}
                description={project.description}
                href={project.href}
                tags={project.tags}
                year={project.year}
              />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 zz Labs. 保持好奇，持续创造。
            </p>
            <nav className="flex items-center gap-6 text-sm">
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                关于
              </a>
              <a
                href="https://88boy.lol/posts"
                target="_blank"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                博客
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                联系
              </a>
            </nav>
          </div>
        </footer>
      </div>
    </main>
  );
}
