import { Github, X, Mail, Twitter } from "lucide-react";

const socialLinks = [
  {
    name: "GitHub",
    href: "https://github.com/xxGw1997",
    icon: Github,
  },
  {
    name: "X",
    href: "https://x.com/xxgw97",
    icon: Twitter,
  },
  {
    name: "Email",
    href: "mailto:xxgw1997@163.com",
    icon: Mail,
  },
];

export function SocialLinks() {
  return (
    <div className="flex items-center gap-4">
      {socialLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary transition-colors"
          aria-label={link.name}
        >
          <link.icon className="w-5 h-5" />
        </a>
      ))}
    </div>
  );
}
