#!/usr/bin/env node
/**
 * 推送到 GitHub，触发自动部署。
 *
 *   双击根目录的 deploy.bat
 *   或：node tools/deploy.mjs https://github.com/用户名/仓库名
 *
 * 为什么用 Node 写而不是 .bat：
 *   批处理里的中文要靠改代码页才不乱码，而且字符串处理（拆仓库地址、
 *   看 git 报错）全靠字符替换，很容易写错还不好查。这个项目本来
 *   tools/ 下面就是一堆 .mjs，放这儿也算回家。
 *
 * 这个脚本不做的事：
 *   - 不碰全局 git 配置
 *   - 不强推（--force）。远端和本地分叉时会停下来问你
 *   - 不处理密码。GitHub 的登录由 Git Credential Manager 弹窗完成
 */

import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** 项目根目录：脚本在 tools/ 下，往上一层 */
const ROOT = fileURLToPath(new URL('..', import.meta.url));
process.chdir(ROOT);

/**
 * --dry-run：全部检查照做，但不提交、不推送。
 * 用来确认脚本本身是对的，不用真往仓库里写东西。
 */
const DRY = process.argv.includes('--dry-run');

const rl = createInterface({ input: process.stdin, output: process.stdout });

/** 输入流结束了没有。管道喂输入、或者用户按了 Ctrl-Z 都会到这一步 */
let stdinClosed = false;
rl.on('close', () => {
  stdinClosed = true;
});

/* ---------- 输出 ---------- */

const say = (s) => console.log(s);
const step = (s) => console.log(`\n▶ ${s}`);
const ok = (s) => console.log(`  ✓ ${s}`);
const warn = (s) => console.log(`  ! ${s}`);

/**
 * 问一句话。
 *
 * 不直接用 rl.question：输入流已经结束时它返回的 promise 永远不会完成，
 * 整个脚本就在这里悄悄停住 —— 不报错、不打印、退出码还是 0，
 * 看上去像「跑完了什么都没做」，最难查。
 * 所以这里跟 close 事件赛跑，流断了就当没得问。
 */
async function ask(prompt) {
  if (stdinClosed) return null;
  const answer = await Promise.race([
    rl.question(prompt),
    new Promise((resolve) => rl.once('close', () => resolve(null))),
  ]);
  // 换行一下，不然 EOF 时光标还贴在提示符后面
  if (answer === null) say('');
  return answer;
}

/** 出错就停下，并把下一步该怎么办说清楚 */
function stop(title, ...hints) {
  console.log(`\n✗ ${title}`);
  for (const h of hints) console.log(`  ${h}`);
  console.log('');
  rl.close();
  process.exit(1);
}

/* ---------- 跑命令 ---------- */

/** 静默执行，拿输出 */
function git(...args) {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  return {
    ok: r.status === 0,
    out: (r.stdout ?? '').trim(),
    err: (r.stderr ?? '').trim(),
  };
}

/** 直接把输出接到控制台：推送要显示进度，登录要能弹窗 */
function gitLive(...args) {
  const r = spawnSync('git', args, { stdio: 'inherit' });
  return r.status === 0;
}

/* ---------- 仓库地址 ---------- */

/**
 * 把用户可能填的各种写法都认下来：
 *   https://github.com/me/repo        ← 从浏览器地址栏复制的
 *   https://github.com/me/repo.git    ← 从 Code 按钮复制的
 *   git@github.com:me/repo.git        ← SSH
 *   me/repo                           ← 偷懒写法
 *
 * 返回 { url, owner, repo }，认不出来返回 null。
 */
function parseRepo(input) {
  const s = input.trim().replace(/\/+$/, '');
  if (!s) return null;

  // SSH：git@github.com:owner/repo.git
  let m = s.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (m) return { url: s, owner: m[1], repo: m[2] };

  // HTTPS，容忍前面少打了 https:// 的情况
  m = s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (m) return { url: `https://github.com/${m[1]}/${m[2]}.git`, owner: m[1], repo: m[2] };

  // 只写了 owner/repo
  m = s.match(/^([A-Za-z0-9][\w.-]*)\/([\w.-]+?)(?:\.git)?$/);
  if (m) return { url: `https://github.com/${m[1]}/${m[2]}.git`, owner: m[1], repo: m[2] };

  return null;
}

/**
 * 问出仓库地址。命令行给了就用，没给就问。
 * 填错不直接退出 —— 退出等于白跑一趟，再问一次就好。
 */
async function askRepo() {
  // 跳过 --dry-run 这类开关，取第一个不以 - 开头的参数
  const fromArgv = process.argv.slice(2).find((a) => !a.startsWith('-'));
  if (fromArgv) {
    const parsed = parseRepo(fromArgv);
    if (parsed) return parsed;
    warn(`认不出这个地址：${fromArgv}`);
  }

  /*
   * 上次推到哪儿，git 自己记着（remote origin）。
   * 第二次跑就不该再让人去翻一遍浏览器地址栏 —— 直接回车沿用。
   */
  const saved = parseRepo(git('remote', 'get-url', 'origin').out || '');

  for (let i = 0; i < 3; i++) {
    say('');
    if (saved) {
      say(`  上次推到：${saved.owner}/${saved.repo}`);
      say('  直接回车就还推这个；要换仓库就填新地址。');
    } else {
      say('  仓库地址填哪个：浏览器打开你的仓库，地址栏整条复制过来就行。');
      say('  例：https://github.com/yourname/language-learning');
    }

    const answer = await ask(saved ? '\n  仓库地址（回车沿用）> ' : '\n  仓库地址 > ');
    if (answer === null) {
      // 流断了但记得上次的地址，就按上次的来，别白跑
      if (saved) return saved;
      stop(
        '没拿到仓库地址。',
        '双击 deploy.bat 会让你在窗口里填；',
        '或者直接带上地址跑：node tools/deploy.mjs 你的仓库地址',
      );
    }
    if (!answer.trim() && saved) return saved;

    const parsed = parseRepo(answer);
    if (parsed) return parsed;
    warn('认不出来。要的是 github.com/用户名/仓库名 这种形式。');
  }
  stop('地址没填对，先退出了。', '下次可以直接：node tools/deploy.mjs 你的仓库地址');
}

/**
 * 是/否，默认否 —— 推送这种事不该因为手快就发生。
 * 问不到（输入流断了）也当否：宁可什么都不做。
 */
async function confirm(question) {
  const a = await ask(`  ${question} [y/N] `);
  if (a === null) return false;
  const v = a.trim().toLowerCase();
  return v === 'y' || v === 'yes';
}

/* ---------- 前置检查 ---------- */

/** 该在项目根目录跑，而不是随便哪个文件夹 */
function checkProject() {
  if (!existsSync(join(ROOT, 'package.json')) || !existsSync(join(ROOT, 'src'))) {
    stop('这里不像是项目文件夹。', '把脚本留在项目里跑，别单独拷出去。');
  }
  if (!git('--version').ok) {
    stop('没找到 git。', '装一个：https://git-scm.com/download/win', '装完重新双击本脚本。');
  }
}

/**
 * git 要有身份才能提交。
 * 只写进这个仓库（--local），不动你的全局配置。
 */
async function ensureIdentity() {
  const name = git('config', 'user.name').out;
  const email = git('config', 'user.email').out;
  if (name && email) {
    ok(`提交身份：${name} <${email}>`);
    return;
  }

  say('');
  say('  git 需要一个提交身份（只写进这个仓库，不改你的全局设置）。');
  const n = (await ask('  显示名字（随便填，比如 chengjinghui）> ') ?? '').trim();
  const e = (await ask('  邮箱（GitHub 上那个）> ') ?? '').trim();
  if (!n || !e) {
    stop(
      '名字和邮箱都得填。',
      '也可以自己先设好，再重新跑：',
      '',
      '    git config --local user.name "你的名字"',
      '    git config --local user.email "你的邮箱"',
    );
  }

  if (DRY) {
    ok(`[演练] 会写入本仓库配置：${n} <${e}>`);
    return;
  }
  git('config', '--local', 'user.name', n);
  git('config', '--local', 'user.email', e);
  ok('已写入本仓库配置');
}

/** 没有仓库就建一个，分支统一叫 main（Actions 只认 main） */
function ensureRepo() {
  if (!existsSync(join(ROOT, '.git'))) {
    if (DRY) {
      ok('[演练] 会在这里创建本地仓库');
      return;
    }
    if (!git('init').ok) stop('git init 失败。');
    ok('已创建本地仓库');
  }

  // --show-current 在「还没有任何提交」时也能用，返回当前分支名；
  // rev-parse HEAD 在那种状态下是失败的，所以不用它。
  const branch = git('branch', '--show-current').out;
  if (branch === 'main') {
    ok('分支 main');
    return;
  }

  if (DRY) {
    ok(`[演练] 会把分支从 ${branch || '(无)'} 切到 main`);
    return;
  }

  const hasCommit = git('rev-parse', '--verify', 'HEAD').ok;
  if (hasCommit) {
    if (!git('branch', '-M', 'main').ok) stop('切换分支到 main 失败。');
  } else {
    // 一个提交都没有时分支还不存在，branch -M 会报 no such branch。
    // 这时候直接把 HEAD 指过去就行。
    if (!git('symbolic-ref', 'HEAD', 'refs/heads/main').ok) {
      stop('切换分支到 main 失败。');
    }
  }
  ok(`分支切到 main${branch ? `（原来是 ${branch}）` : ''}`);
}

/**
 * 绑定远端。
 * 已经绑过同一个地址就什么都不做；绑的是别的地址要先问过你 ——
 * 悄悄改掉等于把代码推到另一个仓库去。
 */
async function ensureRemote(target) {
  const cur = git('remote', 'get-url', 'origin');
  if (!cur.ok) {
    if (DRY) {
      ok(`[演练] 会把远端 origin 指向 ${target.url}`);
      return;
    }
    if (!git('remote', 'add', 'origin', target.url).ok) stop('添加远端失败。');
    ok(`远端 origin → ${target.url}`);
    return;
  }

  const same = cur.out.replace(/\.git$/, '').toLowerCase()
    === target.url.replace(/\.git$/, '').toLowerCase();
  if (same) {
    ok(`远端已是 ${cur.out}`);
    return;
  }

  warn(`远端现在指向：${cur.out}`);
  warn(`你填的是：    ${target.url}`);
  if (!(await confirm('改成你填的这个？'))) {
    stop('没有改动，已退出。', '想推到原来那个仓库，直接回车用默认地址重跑。');
  }
  if (DRY) {
    ok(`[演练] 会把远端改成 ${target.url}`);
    return;
  }
  if (!git('remote', 'set-url', 'origin', target.url).ok) stop('改远端地址失败。');
  ok('远端已更新');
}

/* ---------- 提交 ---------- */

/**
 * 把改动提交掉。
 *
 * 只在真有改动时才提交 —— 没改动也 commit 会报错，
 * 而「没改动」本身是正常情况（上次推完又跑了一次）。
 */
async function commitChanges() {
  // 有没有提交过。全新仓库连 HEAD 都没有
  const hasCommit = git('rev-parse', '--verify', 'HEAD').ok;

  const dirty = git('status', '--porcelain').out;
  if (!dirty) {
    if (!hasCommit) stop('没有任何文件可提交。', '确认你在项目文件夹里。');
    ok('没有新改动，直接推送已有提交');
    return;
  }

  // 统计一下，让人知道这次要提交些什么
  const files = dirty.split('\n').filter(Boolean);
  ok(`有 ${files.length} 个文件改动`);

  // 顺手提醒一句：别把密钥之类的东西提交上去
  const risky = files
    .map((l) => l.slice(3))
    .filter((f) => /(^|\/)\.env|secret|credential|password|token/i.test(f));
  if (risky.length) {
    say('');
    warn('这几个文件名看着像含密钥，Public 仓库是所有人可见的：');
    for (const f of risky.slice(0, 10)) say(`      ${f}`);
    if (!(await confirm('确认要一起提交？'))) {
      stop('已退出，什么都没提交。', '把不该进仓库的文件写进 .gitignore，再重新跑。');
    }
  }

  if (DRY) {
    warn('--dry-run：到此为止，不 add、不 commit');
    return;
  }

  if (!git('add', '-A').ok) stop('git add 失败。');

  // EOF（null）和直接回车（空串）都用默认说明，不卡在这里
  const typed = await ask('\n  这次改了什么（回车用默认「更新素材与功能」）> ');
  const msg = (typed ?? '').trim() || '更新素材与功能';

  // -m 之外不加任何参数：不改历史、不跳过钩子
  const r = git('commit', '-m', msg);
  if (!r.ok) stop('提交失败。', r.err || r.out);
  ok(`已提交：${msg}`);
}

/* ---------- 推送 ---------- */

/**
 * 推上去。
 *
 * 不用 --force。远端有你本地没有的提交时推送会被拒绝，
 * 这时候强推会把远端那些提交删掉 —— 所以这里只是停下来告诉你怎么办。
 */
async function push(target) {
  step('推送到 GitHub');

  if (DRY) {
    warn('--dry-run：不推送。');
    // 顺手验证一下地址通不通。直接问目标地址，不问 origin ——
    // 演练模式没有真的去 add remote，origin 可能还不存在。
    // ls-remote 是只读的，不会改任何东西。
    const probe = git('ls-remote', '--heads', target.url, 'main');
    if (probe.ok) {
      ok('远端可访问，地址没问题');
    } else {
      warn('远端访问不了，真推送时会报同样的错：');
      warn(`  ${probe.err.split('\n')[0] || '(没有更多信息)'}`);
    }
    return true;
  }

  say('  第一次推送会弹出浏览器让你登录 GitHub，按提示点一下就行。');
  say('  （不需要在这里输密码）');
  say('');

  // 远端已经有 main 分支的话，直接推；否则建立跟踪关系
  const remoteHasMain = git('ls-remote', '--heads', 'origin', 'main').out.includes('refs/heads/main');
  const args = remoteHasMain ? ['push', 'origin', 'main'] : ['push', '-u', 'origin', 'main'];

  if (gitLive(...args)) {
    ok('推送成功');
    return true;
  }

  // 失败原因很多，分开说，别让人对着一堆英文发愁
  say('');
  const probe = git('ls-remote', 'origin');
  if (!probe.ok) {
    const e = probe.err.toLowerCase();
    if (e.includes('not found') || e.includes('repository not found')) {
      stop(
        '找不到这个仓库。',
        '确认仓库已经在 GitHub 上建好了，而且地址没打错。',
        '仓库是 Private 的话，登录的账号得有权限。',
      );
    }
    if (e.includes('could not resolve') || e.includes('timed out') || e.includes('connection')) {
      stop('连不上 GitHub。', '检查网络，或者需要代理的话先把代理开着再跑。');
    }
    stop('访问远端失败。', probe.err);
  }

  stop(
    '推送被拒绝了。',
    '最常见的原因：远端有你本地没有的提交（比如在网页上建仓库时勾了 README）。',
    '先把远端的拉下来合并：',
    '',
    '    git pull --rebase origin main',
    '',
    '然后重新双击本脚本。',
    '（这里不会替你强推 —— 那会删掉远端已有的提交）',
  );
  return false;
}

/* ---------- 跑完之后 ---------- */

/** 演练模式的收尾：说清楚什么都没发生，别让人以为推成功了 */
function afterDryRun(target) {
  say('');
  say('━'.repeat(64));
  say('');
  say('  演练结束 —— 没有提交，没有推送，仓库状态没变。');
  say('');
  say('  真要推的话，去掉 --dry-run 重跑：');
  say(`    node tools/deploy.mjs ${target.owner}/${target.repo}`);
  say('  或者直接双击 deploy.bat');
  say('');
  say('━'.repeat(64));
}

/** 推完还有一步要在网页上点，不说清楚就是 404 */
function afterPush(target) {
  const settings = `https://github.com/${target.owner}/${target.repo}/settings/pages`;
  const actions = `https://github.com/${target.owner}/${target.repo}/actions`;
  const site = `https://${target.owner.toLowerCase()}.github.io/${target.repo}/`;

  say('');
  say('━'.repeat(64));
  say('');
  if (DRY) {
    say('  演练结束 —— 什么都没提交、没推送。');
    say('  真跑一遍的话，接下来要做的是：');
  } else {
    say('  代码推上去了。还有一步要在网页上点，不做的话打开是 404：');
  }
  say('');
  say(`    1. 打开 ${settings}`);
  say('    2. Source 选 「GitHub Actions」');
  say('       —— 不是 "Deploy from a branch"，这是最容易点错的地方');
  say('    3. 只需要设置这一次，以后推送都自动部署');
  say('');
  say(`  构建进度（2-3 分钟，等绿色勾）：`);
  say(`    ${actions}`);
  say('');
  say('  部署完的网址：');
  say(`    ${site}`);
  say('');
  say('  以后更新：改完代码再双击 deploy.bat 就行。');
  say('');
  say('━'.repeat(64));
}

/* ---------- 主流程 ---------- */

async function main() {
  say('');
  say('  双语精听 · 推送部署');
  say('  ' + '─'.repeat(40));

  step('检查环境');
  checkProject();
  ok('项目文件夹');
  ok('git 可用');

  const target = await askRepo();
  say('');
  ok(`目标仓库：${target.owner}/${target.repo}`);

  step('准备仓库');
  ensureRepo();
  await ensureIdentity();
  await ensureRemote(target);

  step('构建检查');
  say('  先在本地构建一遍。这里能过，CI 上基本也能过 ——');
  say('  不然推上去等三分钟才看到失败，白等。');
  say('');
  // npm 在 Windows 上是 npm.cmd，而新版 Node 不许直接 spawn .cmd（报 EINVAL），
  // 不走 shell 又找不到 "npm"（ENOENT）—— 所以必须借 shell。
  // 整条命令写成一个字符串而不是 ['run','build']：
  // shell + 参数数组会被 Node 警告参数未转义，一个字符串就没这问题。
  const built = spawnSync('npm run build', { stdio: 'inherit', shell: true });
  if (built.status !== 0) {
    stop('构建失败，没有推送。', '上面的报错修掉再跑。');
  }
  ok('构建通过');

  step('提交改动');
  await commitChanges();

  if (await push(target)) afterPush(target);

  rl.close();
}

main().catch((e) => {
  console.log(`\n✗ 出错了：${e?.message ?? e}\n`);
  rl.close();
  process.exit(1);
});
