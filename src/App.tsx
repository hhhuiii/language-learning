import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useLang } from './lang';
import Home from './pages/Home';
import Library from './pages/Library';
import Study from './pages/Study';
import Dictation from './pages/Dictation';
import ArticlePage from './pages/Article';
import Notebook from './pages/Notebook';
import Guide from './pages/Guide';

function Header() {
  const { lang, setLang } = useLang();
  return (
    <header className="site-head">
      <div className="wrap site-head__in">
        <NavLink to="/" className="brand">
          <span className="brand__mark">双语精听</span>
          <span className="brand__sub">Intensive Listening</span>
        </NavLink>

        <nav className="nav">
          <NavLink to="/library" className={({ isActive }) => (isActive ? 'on' : '')}>
            素材库
          </NavLink>
          <NavLink to="/dictation" className={({ isActive }) => (isActive ? 'on' : '')}>
            听写
          </NavLink>
          <NavLink to="/article" className={({ isActive }) => (isActive ? 'on' : '')}>
            影子跟读
          </NavLink>
          <NavLink to="/notebook" className={({ isActive }) => (isActive ? 'on' : '')}>
            生词本
          </NavLink>
          <NavLink to="/guide" className={({ isActive }) => (isActive ? 'on' : '')}>
            使用说明
          </NavLink>
        </nav>

        <div className="lang-switch" role="group" aria-label="切换学习语言">
          <button
            type="button"
            className={lang === 'ja' ? 'on' : ''}
            aria-pressed={lang === 'ja'}
            onClick={() => setLang('ja')}
          >
            日本語
          </button>
          <button
            type="button"
            className={lang === 'en' ? 'on' : ''}
            aria-pressed={lang === 'en'}
            onClick={() => setLang('en')}
          >
            English
          </button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/study/:workId" element={<Study />} />
          <Route path="/dictation" element={<Dictation />} />
          <Route path="/article" element={<ArticlePage />} />
          <Route path="/notebook" element={<Notebook />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="wrap site-foot">
        <p>
          双语精听 · 学习用途。素材权利归原权利人所有，导入第三方字幕前请自行确认授权范围。
        </p>
      </footer>
    </>
  );
}
