# 李临静 · 视觉设计师作品集

黑色与荧光绿视觉风格的个人作品集，包含交互信箱、个人介绍、8 个项目案例和联系方式。兼容电脑与手机。

## 在线访问

[打开作品集](https://li15635719183-cpu.github.io/-/)

## 本地预览

安装 Node.js 后运行 `npm start`，打开 http://127.0.0.1:4173/。无需构建或安装额外依赖。

## GitHub Pages

仓库 Settings → Pages → Deploy from a branch，选择 `main` 和 `/ (root)`。`.nojekyll` 用于直接发布静态文件。

## Cloudflare Workers

仓库已包含 `wrangler.jsonc`，使用 Workers Static Assets 直接托管网页。Worker 名称与现有项目一致，为 `pro`。

在 Cloudflare 的 Workers 项目 → Settings → Build 中使用以下设置：

- 生产分支：`main`
- 根目录：仓库根目录（留空或 `/`）
- 构建命令：`npm run build`，运行静态文件完整性检查；纯静态项目也可留空
- 部署命令：`npx wrangler deploy`

`.assetsignore` 只公开 HTML、CSS、浏览器 JavaScript 和 `assets/`，不发布开发工具、依赖和本地预览服务器。首页使用 `/`，已有 `.html` 案例链接由 Cloudflare 自动处理。

本机使用 Node.js 22 或更新版本，安装依赖后可运行 `npm run deploy`。`npm start` 仅用于本地预览。

## 页面

- `index.html`：原有交互信箱封面、关于我、作品轮播和联系区。
- `mobile-preview.html`：电脑上的手机尺寸预览。
- 8 个项目详情页：发布会、法律人 AI 大赛、618、萌宠节、音悦计划、呱呱酒屋、绒化岛屿、麓 hood。
- `assets/`：网页使用的图片、纹理、字体与动画资源。

Three.js 的许可证保留在 `assets/vendor/three-LICENSE.txt`。作品中的版权声明、水印和脱敏按原页面保留。
