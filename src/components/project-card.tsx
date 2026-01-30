"use client";

import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface ProjectCardProps {
  title: string;
  description: string;
  href: string;
  tags?: string[];
  year?: string;
}

export function ProjectCard({
  title,
  description,
  href,
  tags = [],
  year,
}: ProjectCardProps) {
  return (
    <Link
      to={href}
      className="group block p-6 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
              {title}
            </h3>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
          {(tags.length > 0 || year) && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {year && (
                <span className="text-xs text-muted-foreground/70">{year}</span>
              )}
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
