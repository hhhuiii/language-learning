import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { LangProvider } from './lang';
import { warmUpVoices, loadTtsManifest } from './audio/player';
import './styles.css';

warmUpVoices();
void loadTtsManifest();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/*
      basename：部署到 GitHub Pages 的子目录时，路由也要加上前缀，
      否则 /article 会被当成 github.io 根目录下的路径，匹配不到任何路由。
      本地 BASE_URL 是 "/"，等于没加。
    */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <LangProvider>
        <App />
      </LangProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
