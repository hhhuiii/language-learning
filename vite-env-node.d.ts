/**
 * vite.config.ts 跑在 Node 里，要读环境变量 BASE_PATH（CI 传进来的部署前缀）。
 *
 * 装 @types/node 只为了这一个变量不值得 —— 那是几 MB 的类型定义，
 * 而这里需要的就是「process.env 是一串可能不存在的字符串」。
 * 所以手写这一条声明，构建工具链保持原样。
 */

declare const process: {
  env: Record<string, string | undefined>;
};
