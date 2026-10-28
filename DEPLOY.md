# 部署到 GitHub Pages（零基础）

这个项目已经配置好自动部署，推送代码就能发布到网上。全程**免费**，不需要代理就能访问。

## 第一步：创建 GitHub 仓库

1. 打开 [github.com](https://github.com)，注册/登录账号
2. 点右上角 **+** → **New repository**
3. 填写：
   - **Repository name**：随便起，比如 `language-learning`（不要用中文）
   - **Public**：选这个（免费用户只能用 Public）
   - 不要勾选 "Add a README file"
4. 点 **Create repository**

## 第二步：上传代码

**方法 A：用 GitHub Desktop（图形界面，推荐新手）**

1. 下载 [GitHub Desktop](https://desktop.github.com/)
2. 打开后登录 GitHub 账号
3. 点 **File** → **Add Local Repository**，选择这个项目文件夹
4. 如果提示 "not a git repository"，点 **Create a repository**
5. 点 **Publish repository**，选择刚才创建的仓库名
6. 完成！代码已上传

**方法 B：用命令行（熟悉终端的用）**

在项目文件夹打开终端，运行：

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

## 第三步：开启 GitHub Pages

1. 打开仓库页面（github.com/你的用户名/你的仓库名）
2. 点 **Settings** 标签
3. 左侧点 **Pages**
4. **Source** 选择 **GitHub Actions**（不是 "Deploy from a branch"）
5. 保存

等 2-3 分钟，刷新页面会看到网址，比如：
```
https://你的用户名.github.io/你的仓库名/
```

打开就能用了！

## 以后更新怎么办

**用 GitHub Desktop：**
1. 修改代码后，打开 GitHub Desktop
2. 左下角填写更新说明（比如"添加新材料"）
3. 点 **Commit to main**
4. 点 **Push origin**
5. 等 2-3 分钟，网站自动更新

**用命令行：**
```bash
git add .
git commit -m "更新说明"
git push
```

## 常见问题

**Q: 推送后网站没更新？**  
A: 打开仓库的 **Actions** 标签，看构建是否完成（绿色勾）。通常 2-3 分钟。

**Q: 网站打开是 404？**  
A: 检查 Settings → Pages 是否选了 **GitHub Actions**（不是 "Deploy from a branch"）

**Q: 访问需要代理吗？**  
A: 不需要，`github.io` 在国内可以直接访问。

**Q: 可以用自己的域名吗？**  
A: 可以，在 Settings → Pages → Custom domain 填写你的域名，然后在域名商那里添加 CNAME 记录指向 `你的用户名.github.io`。

**Q: 这个方案收费吗？**  
A: 完全免费，Public 仓库无限容量和流量。
