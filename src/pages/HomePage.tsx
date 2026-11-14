import { useCallback, useEffect, useRef, useState } from 'react'
import '../styles/home.css'
import { CatFoodEntry } from '../components/CatFoodEntry'
/* ---------------- 数据：轮播 4 帧（V2 · 明亮风格） ---------------- */
type Scene = {
  id: number
  img: string
  video?: string
  title: string[]
  sub: string
}

const SCENES: Scene[] = [
  {
    id: 1,
    img: '/assets/home/scene-1.png',
    video: '/assets/home/hero-loop.mp4',
    title: ['运营同学的一站式', 'SQL训练平台'],
    sub: '说一句中文，就能查数据',
  },
  {
    id: 2,
    img: '/assets/home/scene-2.png',
    title: ['从看不懂，', '到能自己写多表聚合'],
    sub: '15 道题分四关，提交后逐行比对判分',
  },
  {
    id: 3,
    img: '/assets/home/scene-3.png',
    title: ['练坏了一键重置，', '怎么折腾都不怕'],
    sub: '每人一个独立数据空间，随时重来',
  },
  {
    id: 4,
    img: '/assets/home/scene-4.png',
    title: ['打开就能用，', '不需要装任何东西'],
    sub: '不用装环境、不用配权限，浏览器里就能练',
  },
]

const FRAME_MS = 6000 // 每帧 6s
const TICK_MS = 100

/* ---------------- 数据：能力卡片 ---------------- */
const CARDS = [
  {
    title: '说人话就能查数据',
    desc: '把「时间范围 + 指标 + 按什么分组」说清楚，AI 结合真实表结构生成 SQL，还能一键插进编辑器直接执行。',
    tag: '',
    demo: 'ai',
  },
  {
    title: '跑错了 AI 自动改',
    desc: '报错翻成中文，点一下「让 AI 帮我修复」就拿回改正后的 SQL。不用背语法，也不用去搜报错码。',
    tag: '不用背语法',
    demo: 'fix',
  },
  {
    title: '想练什么就造什么',
    desc: '「建一张优惠券表，造 5000 行」，几秒钟就能拿来练。自己造的表只有自己看得到，随时一键重置。',
    tag: '几秒钟生成好',
    demo: 'gen',
  },
  {
    title: '做题有客观判分',
    desc: '15 道题分四关，提交后把你跑出的结果和标准答案逐行比对，不是凭感觉。卡住了还能看提示，每天两三道，两周左右能独立写多表关联。',
    tag: '',
    demo: 'quiz',
  },
] as const

/* ---------------- 数据：三步 / 场景 / FAQ / 页脚 ---------------- */
const STEPS = [
  {
    no: '01',
    title: '先看看数据长什么样',
    desc: '左边常驻一张可搜索的数据字典，字段、类型、含义、样例数据都在，双击字段还能直接插进编辑器。',
  },
  {
    no: '02',
    title: '用中文描述你要看什么',
    desc: '说清「时间范围 + 指标 + 按什么分组 + 取多少条」，AI 一次就能写对；按 Ctrl / Cmd + Enter 执行看结果。',
  },
  {
    no: '03',
    title: '按 1 到 15 做题',
    desc: '四关从认识数据到多表关联，提交后系统逐行比对参考答案。每天两三道，两周左右能独立写多表聚合查询。',
  },
]

const PROMPTS = [
  { tag: '销量复盘', q: '最近 7 天每个渠道的下单金额合计，按金额从高到低，取前 8 个渠道' },
  { tag: '活动效果', q: '大促期间，新用户和老用户的客单价分别是多少？按日期拆开看' },
  { tag: '趋势观察', q: '统计每个月的下单用户数，看最近 6 个月的变化趋势' },
]

const FAQS = [
  {
    q: '会不会动到公司真实数据？',
    a: '不会。内置的是一套模拟电商数据，默认查询模式只读，危险操作需二次确认；不同数据空间完全隔离，练坏了随时一键重置。',
  },
  {
    q: '要不要装软件、配环境？',
    a: '不用。浏览器打开就能用，数据已经内置，AI 也已经接好；要做的只有一件事——记住 Ctrl / Cmd + Enter 是执行。',
  },
  {
    q: '完全不会 SQL，也能上手吗？',
    a: '能。左边随时能查每个字段的含义，AI 能把中文直接变成 SQL；15 道题从认识数据开始，第一题只要会点「运行」就能完成。',
  },
]

const MEGA = [
  { title: '中文生成 SQL', desc: '说人话就能查数据' },
  { title: '报错自动修复', desc: 'AI 给中文解释和改正后的 SQL' },
  { title: '库表结构速查', desc: '字段、类型、含义与样例数据' },
]

const FOOTER_COLS = [
  { title: '产品', links: ['SQL 实验室', '闯关练习', '数据空间'] },
  { title: '学习', links: ['三步上手', '使用手册', '常见报错'] },
  { title: '关于', links: ['平台介绍', '安全规则', '联系我们'] },
]

/* ---------------- 小图标（内联 SVG，按卡片 demo 键取图） ---------------- */
const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function CardIcon({ name }: { name: string }) {
  if (name === 'ai')
    return (
      <svg {...svgProps}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    )
  if (name === 'fix')
    return (
      <svg {...svgProps}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    )
  if (name === 'gen')
    return (
      <svg {...svgProps}>
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
      </svg>
    )
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg {...svgProps}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

/* ---------------- 组件 ---------------- */
export function HomePage({ onGoSql }: { onGoSql: () => void }) {
  const [active, setActive] = useState(0)
  const [remain, setRemain] = useState(FRAME_MS)
  const [paused, setPaused] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const heroRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  /* 轮播：每帧 6s，100ms 步进；hover 暂停。updater 保持纯函数，翻转帧放到独立 effect */
  useEffect(() => {
    if (paused) return
    const t = window.setInterval(() => {
      setRemain((r) => Math.max(0, r - TICK_MS))
    }, TICK_MS)
    return () => window.clearInterval(t)
  }, [paused])

  useEffect(() => {
    if (remain > 0) return
    setActive((a) => (a + 1) % SCENES.length)
    setRemain(FRAME_MS)
  }, [remain])

  /* 键盘左右切帧 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* 导航滚过首屏后变白底 */
  useEffect(() => {
    const onScroll = () => {
      const h = heroRef.current?.offsetHeight ?? window.innerHeight
      setScrolled(window.scrollY > h - 76)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* 视频只在 Scene 1 激活且未暂停时播放；显式设置 muted 属性，兼容 Safari 自动播放策略 */
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.setAttribute('muted', '')
    v.setAttribute('playsinline', '')
    if (active === 0 && !paused) v.play().catch(() => undefined)
    else v.pause()
  }, [active, paused])

  const next = useCallback(() => {
    setActive((a) => (a + 1) % SCENES.length)
    setRemain(FRAME_MS)
  }, [])
  const prev = useCallback(() => {
    setActive((a) => (a - 1 + SCENES.length) % SCENES.length)
    setRemain(FRAME_MS)
  }, [])

  /* 缩略图条与 Scene 胶囊已隐藏（用户反馈：自动轮播即可，不需要外显定位），仅保留下箭头 */
  const go = (hash: string) => {
    document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
  }

  const scene = SCENES[active]

  return (
    <div className="hp">
      {/* 顶部导航：透明 → 白底；Tab 规范见「导航Tab交互状态规范」 */}
      <nav className={'hp-nav' + (scrolled ? ' solid' : '')}>
        <div className="hp-nav-inner">
          <div className="hp-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="hp-logo-chip"><i /><i /><i /></span>
            <span className="hp-logo-name">AI 工作台</span>
          </div>
          <div className="hp-tabs">
            <button className="hp-tab active" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>首页</button>
            <div className="hp-menu">
              <button className="hp-tab" onClick={() => go('#capabilities')}>核心能力</button>
              <div className="hp-mega">
                {MEGA.map((m) => (
                  <a className="hp-mega-item" key={m.title} onClick={() => go('#capabilities')}>
                    <b>{m.title}</b>
                    <span>{m.desc}</span>
                  </a>
                ))}
              </div>
            </div>
            <button className="hp-tab" onClick={() => go('#how')}>上手路径</button>
            <button className="hp-tab" onClick={() => go('#faq')}>常见问题</button>
            <button className="hp-tab" onClick={onGoSql}>SQL 实验室</button>
          </div>
          {/* 「进入 SQL 实验室」主入口在 CTA 区（猫粮碗），导航提供常驻 tab */}
        </div>
      </nav>

      {/* 首屏：全屏轮播。底层图/视频 crossfade 800ms，文字层不参与淡入 */}
      <header
        className="hp-hero"
        ref={heroRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {SCENES.map((s, i) => (
          <div className={'hp-hero-layer' + (i === active ? ' on' : '')} key={s.id} aria-hidden={i !== active}>
            {s.video ? (
              <video ref={i === 0 ? videoRef : undefined} src={s.video} autoPlay loop muted playsInline />
            ) : (
              <img src={s.img} alt={`Scene ${s.id}`} draggable={false} />
            )}
          </div>
        ))}
        {/* 蒙版：整体暖色 14% / 左侧 80%→0 / 顶部 55%→0 */}
        <div className="hp-mask-warm" />
        <div className="hp-mask-left" />
        <div className="hp-mask-top" />

        <div className="hp-hero-content">
          <div className="hp-brand-bars" aria-hidden><i /><i /><i /><i /></div>
          <h1 className="hp-hero-title">{scene.title.map((line, i) => <span key={i} style={{ display: 'block' }}>{line}</span>)}</h1>
          <p className="hp-hero-sub">{scene.sub}</p>
        </div>

        <button className="hp-hero-next" onClick={next} aria-label="下一帧">→</button>

        <div className="hp-hero-foot">
          <button className="hp-hero-down" onClick={() => go('#stats')} aria-label="向下看更多">⌄</button>
        </div>
      </header>

      {/* 数据条：与首屏之间 1px 亮线衔接 */}
      <section className="hp-stats" id="stats">
        <div className="hp-wrap">
          {[
            { n: '10', t: '张模拟业务表，随时可查', blue: false },
            { n: '15', t: '道闯关题，分四关自动判分', blue: false },
            { n: '1 分钟', t: '从想看数据到拿到结果', blue: false },
            { n: '0 风险', t: '默认只读，改不动真实数据', blue: true },
          ].map((s) => (
            <div className={'hp-stat' + (s.blue ? ' blue' : '')} key={s.n}>
              <b>{s.n}</b>
              <span>{s.t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 01 能力 */}
      <section className="hp-section hp-soft" id="capabilities">
        <div className="hp-wrap">
          <p className="hp-eyebrow">01 / Capabilities</p>
          <h2 className="hp-h2">从看不懂，到能自己写多表聚合</h2>
          <p className="hp-h2-sub">看懂库表、用中文描述需求、生成 SQL、调试执行、错题回流，一个页面里完成整个练习闭环。</p>
          <div className="hp-cards">
            {CARDS.map((c) => (
              <div className="hp-card" key={c.title}>
                <div className="hp-card-top">
                  <span className="hp-card-ico"><CardIcon name={c.demo} /></span>
                  <h3>{c.title}</h3>
                  {c.tag ? <span className="hp-tag">{c.tag}</span> : null}
                </div>
                <p>{c.desc}</p>
                {c.demo === 'ai' && (
                  <div className="hp-demo">
                    <span className="dot-ok">AI 已接入 · 生成 SQL</span>
                    <span className="hp-demo-quote">最近 7 天每个渠道的下单金额合计，按金额从高到低，取前 8 个渠道</span>
                    <span className="hp-demo-sql">SELECT channel, SUM(amount) AS gmv FROM orders GROUP BY channel;</span>
                  </div>
                )}
                {c.demo === 'fix' && (
                  <div className="hp-demo">
                    <div className="hp-demo-flow">
                      <span className="err">Unknown column 'amt'</span>
                      <span>→</span>
                      <span className="fix">让 AI 帮我修复</span>
                      <span>→</span>
                      <span className="ok">amount</span>
                    </div>
                  </div>
                )}
                {c.demo === 'gen' && (
                  <div className="hp-demo">
                    <div className="hp-demo-cols">
                      <i>coupon_id</i><i>user_id</i><i>amount</i><i>created_at</i>
                      <b>× 5000 行</b>
                    </div>
                  </div>
                )}
                {c.demo === 'quiz' && (
                  <div className="hp-demo">
                    <div className="hp-demo-progress">
                      <span>闯关进度</span>
                      <span className="bar"><i /></span>
                      <span className="num">9 / 15</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 02 三步上手 */}
      <section className="hp-section" id="how">
        <div className="hp-wrap">
          <p className="hp-eyebrow">02 / How It Works</p>
          <h2 className="hp-h2">三步上手，打开就能练</h2>
          <p className="hp-h2-sub">不需要装环境、不需要真实数据权限，也不用先啃完一本 SQL 教程。</p>
          <div className="hp-steps">
            {STEPS.map((s) => (
              <div className="hp-step" key={s.no}>
                <span className="hp-step-no">{s.no}</span>
                <div>
                  <b>{s.title}</b>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 真实提问（深色区） */}
      <section className="hp-section hp-dark">
        <div className="hp-wrap">
          <div className="hp-dark-grid">
            <div>
              <p className="hp-eyebrow">03 / Scenarios</p>
              <h2 className="hp-h2">运营每天要问的那些问题，<br />一句话就够了</h2>
              <p className="hp-dark-desc">
                不用等技术排期，也不用记表名和语法。像平时交代需求那样说一句，系统把 SQL 写出来、跑出结果，你只负责看懂它。
              </p>
              <p className="hp-dark-note">
                <ShieldIcon />
                <span>里面的数据是模拟电商业务数据，怎么折腾都不会影响公司真实数据。</span>
              </p>
            </div>
            <div>
              <div className="hp-prompts-label"><b>REAL PROMPTS</b><span>真实提问</span></div>
              {PROMPTS.map((p) => (
                <div className="hp-prompt" key={p.tag}>
                  <span className="tag">{p.tag}</span>
                  <span className="q">{p.q}</span>
                </div>
              ))}
              <div className="hp-prompt-status">执行成功 · 返回 8 行 · 可导出 CSV 或复制进飞书表格</div>
            </div>
          </div>
        </div>
      </section>

      {/* 04 FAQ */}
      <section className="hp-section" id="faq">
        <div className="hp-wrap">
          <div className="hp-faq-grid">
            <div>
              <p className="hp-eyebrow">04 / FAQ</p>
              <h2 className="hp-h2">你可能还在担心</h2>
              <p className="hp-h2-sub">把最常见的三个顾虑，先说清楚。</p>
            </div>
            <div>
              {FAQS.map((f, i) => (
                <div className={'hp-faq-item' + (i === openFaq ? ' open' : '')} key={f.q}>
                  <button className="hp-faq-q" onClick={() => setOpenFaq(i === openFaq ? -1 : i)}>
                    {f.q}
                    <span className="sign">＋</span>
                  </button>
                  <div className="hp-faq-a">{f.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA：唯一入口 = 动态猫粮碗（3D 滚动叙事过场） */}
      <section className="hp-cta hp-soft">
        <div className="hp-wrap">
          <p className="hp-eyebrow">Ready to Start</p>
          <h2>今天就开始练第一道题</h2>
          <p>打开就能用，不需要装任何东西，也不需要真实数据权限。</p>
          <CatFoodEntry onEnter={onGoSql} />
        </div>
      </section>

      {/* 页脚 */}
      <footer className="hp-footer">
        <div className="hp-wrap">
          <div className="hp-footer-top">
            <div className="hp-footer-brand">
              <div className="hp-logo">
                <span className="hp-logo-chip"><i /><i /><i /></span>
                <span className="hp-logo-name">AI 工作台</span>
              </div>
              <p>运营同学的一站式SQL训练平台</p>
            </div>
            <div className="hp-footer-cols">
              {FOOTER_COLS.map((col) => (
                <div className="hp-footer-col" key={col.title}>
                  <h5>{col.title}</h5>
                  {col.links.map((l) => (
                    <a key={l} onClick={l === 'SQL 实验室' ? onGoSql : () => go('#capabilities')}>{l}</a>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="hp-footer-bottom">
            <span>Copyright 2026 AI 工作台</span>
            <span>SQL 实验室 · 内置模拟电商数据集</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
