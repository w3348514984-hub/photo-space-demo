# Photo Space · 照片宇宙

一个独立、无外部运行依赖的可交互照片空间网页原型。

注意：本项目是根据用户提供的视频效果新写的相似交互原型，
不是视频原作者的网站源代码，也不是之前提到的 3D 翻页书仓库。

## 功能
- 照片云、环形年轮、弧形长廊、记忆长卷、回忆墙五种布局
- 拖动旋转、滚轮缩放、点击大图和左右翻页
- 本地导入图片（最多 250 张，其中前 110/60 张用于空间渲染）
- 轻量模式：一次渲染 60 张，降低浏览器负担
- 中文界面，Mac / Windows / 手机浏览器可运行
- 无账户、无外部 API、无需 npm / 后端

## 立即体验
在浏览器打开 index.html。部署为 GitHub Pages 后，访问仓库 Pages URL。

## 更换照片
页面右上角点击“导入我的照片”，选择或拖入文件。
照片在当前浏览器内处理，不自动上传。
刷新后会恢复示例内容；网页本身没有云端照片库。

## 部署 GitHub Pages
1. 在 GitHub 新建公开仓库 photo-space-demo（不要初始化 README 或 .gitignore）。
2. 从这个目录运行 git push -u origin main，或使用下载目录内的 发布-photo-space.command。
3. 进入仓库 Settings > Pages，Source 选择 Deploy from a branch，
   Branch 选择 main，Folder 选择 / (root)，保存。
4. 页面部署完成后地址通常为
   https://w3348514984-hub.github.io/photo-space-demo/
   在浏览器实际访问成功前，此 URL 只是预期地址。

GitHub Pages 文档：
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 继续修改
- index.html：页面结构和控件
- styles.css：主题、排版和交互样式
- app.js：5 种布局计算、照片导入、交互与渲染

## 注意
公开仓库中只包含上述源码，不包含用户导入过的私人照片。
GitHub Pages 为公开网站，不要把私人照片复制进仓库后提交。
