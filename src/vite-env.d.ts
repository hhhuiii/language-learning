/// <reference types="vite/client" />

// 这一行把 import.meta.env 的类型引进来（BASE_URL 等）。
// 没有它，src/media.ts 和 main.tsx 里读 import.meta.env 会报
// 「Property 'env' does not exist on type 'ImportMeta'」。
