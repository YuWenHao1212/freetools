export const EXTERNAL_LINKS = {
  personalSite: "https://yu-wenhao.com",
  blog: "https://yu-wenhao.com/blog",
  airesumeadvisor: "https://airesumeadvisor.com",
} as const;

export const SOCIAL_LINKS = {
  linkedin: "https://www.linkedin.com/in/yu-wen-hao/",
  github: "https://github.com/YuWenHao1212",
  facebook: "https://www.facebook.com/yuwenhao",
} as const;

export function withUtm(url: string, source: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}ref=${source}`;
}
