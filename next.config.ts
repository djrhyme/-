import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 自建服务器部署：生成可独立运行的产物（node server.js 直接启动）
  output: "standalone",
};

export default nextConfig;
