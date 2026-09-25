# 扫雷 Minesweeper

纯静态网页扫雷，无后端依赖。

## 本地预览

用任意静态服务器打开本目录，例如：

```bash
npx serve .
# 或
python3 -m http.server 8080
```

浏览器打开对应地址即可。

## 部署到 Cloudflare Pages

```bash
npx wrangler pages deploy . --project-name=minesweeper
```

或在 Cloudflare Dashboard → Pages → Create → Upload assets，上传本目录全部文件。

也可丢到任意静态托管（Nginx、GitHub Pages、Vercel Static 等）。
