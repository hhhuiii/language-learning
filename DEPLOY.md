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

**方法 A：双击 `deploy.bat`（推荐）**

1. 在项目文件夹里双击 **deploy.bat**
2. 它会问你仓库地址 —— 把浏览器地址栏里那条整条粘过来就行，
   比如 `https://github.com/你的用户名/language-learning`
3. 第一次推送会弹出浏览器让你登录 GitHub，按提示点一下
   （**不需要在窗口里输密码**，登录由 Git 自己的凭据管理器处理）
4. 看到「推送成功」就好了

它会按顺序做这些事，哪一步出问题就停下来告诉你怎么办：

- 检查 git 和项目文件夹
- 建本地仓库、分支切到 `main`（Actions 只认 main）
- 绑定远端（已经绑了别的地址会先问过你，不会悄悄改掉）
- **先在本地构建一遍** —— 构建不过就不推，省得等三分钟才看到 CI 失败
- 提交（文件名看着像密钥的会先提醒你一句）
- 推送

想先看看它会做什么、但不真推，加一个 `--dry-run`：

```bash
node tools/deploy.mjs 你的仓库地址 --dry-run
```

**方法 B：用命令行（熟悉终端的用）**

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

**方法 C：用 GitHub Desktop（图形界面）**

1. 下载 [GitHub Desktop](https://desktop.github.com/)
2. 打开后登录 GitHub 账号
3. 点 **File** → **Add Local Repository**，选择这个项目文件夹
4. 如果提示 "not a git repository"，点 **Create a repository**
5. 点 **Publish repository**，选择刚才创建的仓库名

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

**用脚本（最省事）：** 改完代码双击 `deploy.bat`，填不填地址都行（记住上次的了）。

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
