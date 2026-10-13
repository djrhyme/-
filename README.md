# 记词本 · 在线英语单词记忆练习工具

自选词书、自定义每日背词量，预览记忆 + 拼写/字母选择测验，错题按间隔重复自动安排复习。
定位为**单词记忆练习工具**，不含学科教学、考试辅导与 AI 生成内容。

- 技术栈：Next.js 15（App Router，SSR）+ TypeScript + Tailwind CSS + Prisma + PostgreSQL
- 登录：Session Cookie（HttpOnly）+ bcrypt 密码哈希
- 邮箱验证码：SendCloud（开发环境默认 `console` 模式，验证码走服务端日志）
- 会员付费：支付宝电脑网站支付（手动续费，无自动扣款）

## 功能范围

| 模块 | 说明 |
| --- | --- |
| 词书 | 8 套词书，全部来源于开源 ECDICT 词典（MIT），只读、不支持用户自建词表 |
| 每日计划 | 免费版开放小学、初中词书且每日新词上限 30；会员开放全部词书、上限 200 |
| 学习流程 | 页面 A 预览（英文 + 释义，不判对错）→ 页面 B 测验（键盘拼写 / 字母选择，右方向键翻页） |
| 复习 | 答对 familiarity +1、间隔拉长（1/2/4/7/15/30 天）；答错重置并更早复习，进入错题本 |
| 错题本 | 独立入口，不受每日计划限制，可反复复习 |
| 个人中心 | 累计学习单词、今日完成量、错题数量、连续打卡天数；词书进度、订单记录、会员到期；一键清空当前词书学习记录 |
| 静态页 | 首页、隐私政策、免责声明、词库版权声明（含词库来源与许可证） |

## 本地开发

环境要求：Node.js 20+、Git、Docker（可选，用于本地 PostgreSQL）。

```bash
# 1. 本地数据库（宿主端口用 5439，避免与已有 Postgres 冲突）
docker run -d --name vocab-site-pg -e POSTGRES_PASSWORD=change-me \
  -e POSTGRES_DB=vocab_site -p 5439:5432 postgres:17-alpine

# 2. 配置环境变量
cp .env.example .env      # 开发时把 MAIL_PROVIDER 改为 console

# 3. 安装依赖、迁移数据库
npm install
npx prisma migrate deploy

# 4. 启动
npm run dev               # http://localhost:3000
```

`MAIL_PROVIDER=console` 时注册验证码会打印在服务端日志，并直接回传给前端自动填入，方便本地联调；生产构建会拒绝该模式。

词库 JSON 已经生成在 `public/wordbooks/`，随仓库发布。如需重新生成（`ecdict.csv` 不入库）：

```bash
node tools/build-wordbooks.mjs path/to/ecdict.csv
```

## 生产部署（国内轻量云服务器 + Nginx + 全站 HTTPS）

1. **备案**：域名先完成 ICP 备案，接入商与服务器同属国内节点。未备案域名无法解析到国内服务器，也无法配置支付宝回调地址。
2. **环境变量**：`cp .env.example .env`，填写
   - `NEXT_PUBLIC_SITE_URL=https://your-domain.com`
   - `MAIL_PROVIDER=sendcloud` 与 4 项 SendCloud 参数
   - `SITE_INVITE_CODE`：设置后注册改为邀请制（只给自己和受邀者）；留空则开放注册
   - `ALIPAY_*`：应用 ID、应用私钥、支付宝公钥、`ALIPAY_NOTIFY_URL`、`ALIPAY_RETURN_URL`。四项齐全才会真正跳转支付，否则订单记为待支付并在页面提示「支付参数尚未配置」
   - `POSTGRES_PASSWORD`（compose 使用）与 `DATABASE_URL`（容器内主机名为 `db`）
3. **构建并启动**：

```bash
docker compose up -d --build
docker compose logs -f web     # 启动时自动执行 prisma migrate deploy
```

容器只监听 `127.0.0.1:3000`，对外由 Nginx 代理。

4. **Nginx**：参考 `deploy/nginx.vocab-site.conf`，替换域名与证书路径，务必保留 `X-Forwarded-Proto`，否则 Secure Cookie 与支付宝回调地址协议会错乱。

```bash
sudo cp deploy/nginx.vocab-site.conf /etc/nginx/conf.d/vocab-site.conf
sudo nginx -t && sudo systemctl reload nginx
```

5. **证书**：`certbot --nginx -d your-domain.com`，或上传云厂商签发的证书到 `/etc/nginx/ssl/`。
6. **支付宝后台**：回调地址填 `https://your-domain.com/api/pay/notify`，返回地址填 `https://your-domain.com/membership`，公钥模式使用「支付宝公钥」而非「应用公钥」。

## 合规要点

- 词库释义来自 [ECDICT](https://github.com/skywind3000/ECDICT)（MIT License, Copyright (c) 2025 Linwei），`/copyright` 页与页脚标注来源与许可证；不抓取任何商业背单词产品的词表。
- 免责声明文案见 `/disclaimer`：本站仅为英语单词记忆练习工具，不提供学科教学、考试提分辅导。
- 密码使用 bcrypt 存储；会话只保存令牌哈希；邮箱验证码只存 bcrypt 哈希且有有效期与尝试次数上限；生产环境不打印验证码（只有 `MAIL_PROVIDER=console` 的本地开发模式会打印）。
- 学习记录、邮箱、密码仅用于本站登录与复习安排，第三方只有 SendCloud（邮件）与支付宝（支付）。
- V1 不含音频、AI 生成内容、社区与内容上传功能。

## 常用运维命令

```bash
npx prisma migrate deploy          # 应用迁移
docker compose build --no-cache web && docker compose up -d web   # 重新发布
docker compose exec db pg_dump -U postgres vocab_site > backup.sql  # 数据备份
```

`/api/auth/code` 有每分钟 IP 限流；支付宝回调验签 + 金额校验后才写会员时长，重复回调幂等。
