/**
 * 媒体文件地址。
 *
 * 数据文件里写的是 "/media/articles/xxx.mp3" —— 根目录开头的绝对路径。
 * 本地跑在 http://localhost:5173/ 下，这么写没问题；
 * 但 GitHub Pages 把站点放在 https://用户名.github.io/仓库名/ 下，
 * "/media/..." 会被解析到 github.io 的根目录，而不是仓库目录，
 * 结果所有音频 404，页面看着正常、点播放没声音。
 *
 * Vite 构建时会把实际前缀写进 import.meta.env.BASE_URL
 * （本地是 "/"，Pages 上是 "/仓库名/"），这里统一套上去。
 */

/** 把数据里的 /media/... 换成当前部署前缀下的真实地址 */
export function mediaUrl(path: string): string {
  if (!path) return path;
  // 外链（别人服务器上的音频）原样返回，不能加前缀
  if (/^https?:\/\//i.test(path)) return path;
  const base = import.meta.env.BASE_URL || '/';
  return base.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
}
