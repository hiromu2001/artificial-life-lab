import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { イベント, 個体, シミュレーション, 設定, 数値制限, 標準設定, 二周率 } from './simulation'
import './styles.css'

const 速度候補 = [
  { 値: '0.5', 表示: '0.5倍' },
  { 値: '1', 表示: '1倍' },
  { 値: '2', 表示: '2倍' },
  { 値: '5', 表示: '5倍' },
  { 値: '10', 表示: '10倍' },
  { 値: 'max', 表示: '最速' },
] as const

type 速度 = (typeof 速度候補)[number]['値']

const 感覚名 = ['餌が見える', '餌の近さ', '餌の左右', '餌の前後', '他個体の近さ', '他個体の左右', '他個体の前後', 'エネルギー', '年齢', 'ゆらぎ']
const 行動名 = ['前進', '左旋回', '右旋回', '食べる']

function 世界を描く(canvas: HTMLCanvasElement, 世界: シミュレーション, 選択id: number | null) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#07100c'
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = 'rgba(117,255,174,.055)'
  ctx.lineWidth = 1
  for (let x = 0; x <= w; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  }
  for (let y = 0; y <= h; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }

  for (const 餌 of 世界.餌一覧) {
    ctx.beginPath()
    ctx.arc(餌.x, 餌.y, 餌.大きさ, 0, 二周率)
    ctx.fillStyle = '#ffe66d'
    ctx.fill()
  }

  for (const 生物 of 世界.個体一覧) {
    const 選択中 = 生物.id === 選択id
    if (選択中) {
      ctx.beginPath()
      ctx.arc(生物.x, 生物.y, 生物.遺伝子.視野, 0, 二周率)
      ctx.strokeStyle = 'rgba(117,255,174,.22)'
      ctx.stroke()
    }
    ctx.save()
    ctx.translate(生物.x, 生物.y)
    ctx.rotate(生物.向き)
    ctx.beginPath()
    ctx.moveTo(9, 0)
    ctx.lineTo(-7, 6)
    ctx.lineTo(-4.5, 0)
    ctx.lineTo(-7, -6)
    ctx.closePath()
    ctx.fillStyle = `hsl(${生物.遺伝子.色相} 78% ${選択中 ? 70 : 57}%)`
    ctx.fill()
    if (選択中) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.6
      ctx.stroke()
    }
    ctx.restore()
  }
}

function 脳を描く(canvas: HTMLCanvasElement, 生物: 個体 | null) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#09140f'
  ctx.fillRect(0, 0, w, h)

  if (!生物 || !生物.脳.活性値.length) {
    ctx.fillStyle = '#799185'
    ctx.font = '14px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('個体をクリックすると脳の動きが見えます', w / 2, h / 2)
    return
  }

  const 活性 = 生物.脳.活性値
  const 位置: { x: number; y: number }[][] = []
  for (let 列 = 0; 列 < 活性.length; 列++) {
    const 数 = 活性[列].length
    const x = 44 + 列 * ((w - 88) / (活性.length - 1))
    const 配列: { x: number; y: number }[] = []
    for (let i = 0; i < 数; i++) 配列.push({ x, y: 数 === 1 ? h / 2 : 30 + i * ((h - 60) / (数 - 1)) })
    位置.push(配列)
  }

  ctx.lineWidth = 0.7
  for (let 列 = 0; 列 < 位置.length - 1; 列++) {
    const 入力数 = 位置[列].length
    const 出力数 = 位置[列 + 1].length
    const 重み = 生物.脳.重み[列]
    for (let j = 0; j < 出力数; j++) {
      for (let i = 0; i < 入力数; i++) {
        const 値 = 重み[j * 入力数 + i]
        const 濃さ = 数値制限(Math.abs(値) * 0.15, 0.02, 0.24)
        ctx.strokeStyle = 値 >= 0 ? `rgba(117,255,174,${濃さ})` : `rgba(255,110,125,${濃さ})`
        ctx.beginPath()
        ctx.moveTo(位置[列][i].x, 位置[列][i].y)
        ctx.lineTo(位置[列 + 1][j].x, 位置[列 + 1][j].y)
        ctx.stroke()
      }
    }
  }

  for (let 列 = 0; 列 < 位置.length; 列++) {
    for (let i = 0; i < 位置[列].length; i++) {
      const 値 = 活性[列][i]
      const 正規化 = 列 === 位置.length - 1 ? 数値制限(値, 0, 1) : 数値制限((値 + 1) / 2, 0, 1)
      ctx.beginPath()
      ctx.arc(位置[列][i].x, 位置[列][i].y, 3.5 + 正規化 * 4, 0, 二周率)
      ctx.fillStyle = `rgba(117,255,174,${0.18 + 正規化 * 0.82})`
      ctx.fill()
    }
  }

  ctx.fillStyle = '#8ca397'
  ctx.font = '11px system-ui'
  ctx.textAlign = 'left'
  ctx.fillText('感覚入力', 10, 16)
  ctx.textAlign = 'right'
  ctx.fillText('行動候補', w - 10, 16)
}

function 推移を描く(canvas: HTMLCanvasElement, 世界: シミュレーション) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const 履歴 = 世界.統計.履歴
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#0a1511'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,.06)'
  for (let i = 1; i < 5; i++) {
    const y = i * h / 5
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }
  if (履歴.length < 2) return

  const 最大個体 = Math.max(10, ...履歴.map((d) => d.個体数))
  const 最大世代 = Math.max(1, ...履歴.map((d) => d.最大世代))
  const 線 = (値取得: (i: number) => number, 最大: number, 色: string) => {
    ctx.beginPath()
    履歴.forEach((_, i) => {
      const x = 16 + (i / (履歴.length - 1)) * (w - 32)
      const y = h - 20 - (値取得(i) / 最大) * (h - 42)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = 色
    ctx.lineWidth = 2
    ctx.stroke()
  }
  線((i) => 履歴[i].個体数, 最大個体, '#75ffae')
  線((i) => 履歴[i].最大世代, 最大世代, '#63c8ff')
  ctx.font = '11px system-ui'
  ctx.fillStyle = '#75ffae'
  ctx.textAlign = 'left'
  ctx.fillText(`個体数（最大 ${最大個体}）`, 12, 15)
  ctx.fillStyle = '#63c8ff'
  ctx.textAlign = 'right'
  ctx.fillText(`世代（最大 ${最大世代}）`, w - 12, 15)
}

function App() {
  const 世界Canvas = useRef<HTMLCanvasElement>(null)
  const 脳Canvas = useRef<HTMLCanvasElement>(null)
  const 推移Canvas = useRef<HTMLCanvasElement>(null)
  const 世界Ref = useRef<シミュレーション | null>(null)
  const 実行中Ref = useRef(false)
  const 速度Ref = useRef<速度>('1')
  const 選択Ref = useRef<number | null>(null)

  const [実行中, set実行中] = useState(false)
  const [速度, set速度] = useState<速度>('1')
  const [選択id, set選択id] = useState<number | null>(null)
  const [設定値, set設定値] = useState<設定>(標準設定)
  const [イベント一覧, setイベント一覧] = useState<イベント[]>([])
  const [, 再描画] = useState(0)

  const イベント追加 = (イベント: イベント) => {
    setイベント一覧((現在) => [イベント, ...現在].slice(0, 60))
  }

  const 新しい実験 = (次設定: 設定 = 設定値, 自動開始 = false) => {
    if (!世界Canvas.current) return
    setイベント一覧([])
    const 世界 = new シミュレーション(世界Canvas.current.width, 世界Canvas.current.height, 次設定, イベント追加)
    世界Ref.current = 世界
    選択Ref.current = null
    set選択id(null)
    実行中Ref.current = 自動開始
    set実行中(自動開始)
    再描画((n) => n + 1)
  }

  useEffect(() => {
    if (!世界Canvas.current || 世界Ref.current) return
    新しい実験(標準設定, false)
  }, [])

  useEffect(() => { 実行中Ref.current = 実行中 }, [実行中])
  useEffect(() => { 速度Ref.current = 速度 }, [速度])
  useEffect(() => { 選択Ref.current = 選択id }, [選択id])

  useEffect(() => {
    let アニメ番号 = 0
    let 半速切替 = false
    let フレーム = 0

    const ループ = () => {
      const 世界 = 世界Ref.current
      if (世界 && 実行中Ref.current && 世界.個体一覧.length > 0) {
        const 現在速度 = 速度Ref.current
        let 回数 = 現在速度 === 'max' ? 80 : Number(現在速度)
        if (現在速度 === '0.5') {
          半速切替 = !半速切替
          回数 = 半速切替 ? 1 : 0
        }
        for (let i = 0; i < 回数; i++) 世界.進める()
        if (世界.個体一覧.length === 0) {
          実行中Ref.current = false
          set実行中(false)
        }
      }

      if (世界 && 世界Canvas.current && 脳Canvas.current && 推移Canvas.current) {
        const 選択個体 = 選択Ref.current === null ? null : 世界.個体一覧.find((個体) => 個体.id === 選択Ref.current) ?? null
        if (!選択個体 && 選択Ref.current !== null) {
          選択Ref.current = null
          set選択id(null)
        }
        世界を描く(世界Canvas.current, 世界, 選択個体?.id ?? null)
        脳を描く(脳Canvas.current, 選択個体)
        if (フレーム % 4 === 0) 推移を描く(推移Canvas.current, 世界)
        if (フレーム % 6 === 0) 再描画((n) => n + 1)
      }

      フレーム++
      アニメ番号 = requestAnimationFrame(ループ)
    }

    アニメ番号 = requestAnimationFrame(ループ)
    return () => cancelAnimationFrame(アニメ番号)
  }, [])

  const 世界 = 世界Ref.current
  const 選択個体 = 世界 && 選択id !== null ? 世界.個体一覧.find((個体) => 個体.id === 選択id) ?? null : null

  const canvasクリック = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = 世界Canvas.current
    const 現在世界 = 世界Ref.current
    if (!canvas || !現在世界) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * canvas.width / rect.width
    const y = (e.clientY - rect.top) * canvas.height / rect.height
    let 最寄り: 個体 | null = null
    let 最短 = 18 * 18
    for (const 生物 of 現在世界.個体一覧) {
      const dx = 生物.x - x
      const dy = 生物.y - y
      const 距離二乗 = dx * dx + dy * dy
      if (距離二乗 < 最短) {
        最短 = 距離二乗
        最寄り = 生物
      }
    }
    set選択id(最寄り?.id ?? null)
  }

  const 設定変更 = (項目: keyof 設定, 値: string | number) => {
    set設定値((現在) => ({ ...現在, [項目]: 値 }))
  }

  const おすすめ設定 = () => {
    const 次 = { ...標準設定, シード: `実験-${Math.floor(Math.random() * 100000)}` }
    set設定値(次)
    新しい実験(次, true)
  }

  const 過酷設定 = () => {
    const 次 = { ...設定値, 初期個体数: 160, 初期餌数: 180, 最大餌数: 260, 餌の出現率: 0.08, 突然変異率: 0.12, シード: `過酷-${Math.floor(Math.random() * 100000)}` }
    set設定値(次)
    新しい実験(次, true)
  }

  const 豊富設定 = () => {
    const 次 = { ...設定値, 初期個体数: 120, 初期餌数: 500, 最大餌数: 750, 餌の出現率: 0.28, シード: `豊富-${Math.floor(Math.random() * 100000)}` }
    set設定値(次)
    新しい実験(次, true)
  }

  const 結果保存 = () => {
    if (!世界) return
    const 内容 = JSON.stringify({
      設定: 世界.設定,
      時刻: 世界.時刻,
      統計: 世界.統計,
      生存個体: 世界.個体一覧.map((個体) => ({
        id: 個体.id,
        世代: 個体.世代,
        年齢: 個体.年齢,
        エネルギー: 個体.エネルギー,
        子供数: 個体.子供数,
        食べた餌数: 個体.食べた餌数,
        速度: 個体.遺伝子.速度,
        視野: 個体.遺伝子.視野,
      })),
    }, null, 2)
    const url = URL.createObjectURL(new Blob([内容], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `人工生命実験-${世界.設定.シード}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">人工生命・進化シミュレーター</p>
          <h1>人工生命ラボ</h1>
          <p className="lead">小さな脳を持つ生物を放置して、餌を探す能力が世代をまたいで進化するか観察します。</p>
        </div>
        <div className="hero-badge">React / TypeScript</div>
      </header>

      <section className="howto">
        <strong>遊び方</strong>
        <div className="steps">
          <span><b>1</b> 「開始」を押す</span>
          <span><b>2</b> 緑の個体をクリックする</span>
          <span><b>3</b> 慣れたら速度を「最速」にする</span>
        </div>
        <p>黄色い点が餌、緑色の三角が生物です。生物には「餌へ向かえ」という命令を入れていません。生き残って子孫を残せた脳だけが増えていきます。</p>
      </section>

      <section className="toolbar card">
        <div className="button-row">
          <button className="primary" onClick={() => set実行中(true)}>開始</button>
          <button onClick={() => set実行中(false)}>一時停止</button>
          <button onClick={() => 新しい実験(設定値, false)}>同じ条件でやり直す</button>
          <button onClick={おすすめ設定}>おすすめ条件で新しく始める</button>
        </div>
        <label className="speed-control">速度
          <select value={速度} onChange={(e) => set速度(e.target.value as 速度)}>
            {速度候補.map((候補) => <option key={候補.値} value={候補.値}>{候補.表示}</option>)}
          </select>
        </label>
      </section>

      <section className="stats-grid">
        <div className="stat"><span>現在の個体数</span><strong>{世界?.個体一覧.length ?? 0}</strong></div>
        <div className="stat"><span>最高世代</span><strong>第{世界?.統計.最大世代 ?? 0}世代</strong></div>
        <div className="stat"><span>経過ステップ</span><strong>{(世界?.時刻 ?? 0).toLocaleString()}</strong></div>
        <div className="stat"><span>出生数</span><strong>{(世界?.統計.出生数 ?? 0).toLocaleString()}</strong></div>
        <div className="stat"><span>死亡数</span><strong>{(世界?.統計.死亡数 ?? 0).toLocaleString()}</strong></div>
        <div className="stat"><span>食べた餌</span><strong>{(世界?.統計.食べた餌数 ?? 0).toLocaleString()}</strong></div>
      </section>

      <section className="main-grid">
        <div className="card world-card">
          <div className="section-heading">
            <div><h2>生態系</h2><p>緑の生物をクリックすると、その個体の状態と脳が見られます。</p></div>
            <div className="legend"><span className="food-dot" />餌 <span className="life-dot" />人工生命</div>
          </div>
          <canvas ref={世界Canvas} width={900} height={560} onClick={canvasクリック} className="world-canvas" />
          {世界?.個体一覧.length === 0 && <div className="extinct">全滅しました。餌を増やすか、新しい条件で再挑戦してください。</div>}
        </div>

        <aside className="side-stack">
          <div className="card inspector">
            <div className="section-heading"><div><h2>選択した個体</h2><p>{選択個体 ? `個体 #${選択個体.id}` : 'まだ選択されていません'}</p></div></div>
            {!選択個体 ? <p className="empty">生態系の中にいる緑色の三角をクリックしてください。</p> : (
              <div className="info-grid">
                <div><span>世代</span><strong>第{選択個体.世代}世代</strong></div>
                <div><span>年齢</span><strong>{選択個体.年齢}</strong></div>
                <div><span>エネルギー</span><strong>{選択個体.エネルギー.toFixed(1)}</strong></div>
                <div><span>現在の行動</span><strong>{選択個体.最終行動}</strong></div>
                <div><span>食べた餌</span><strong>{選択個体.食べた餌数}</strong></div>
                <div><span>子供</span><strong>{選択個体.子供数}</strong></div>
                <div><span>移動速度</span><strong>{選択個体.遺伝子.速度.toFixed(2)}</strong></div>
                <div><span>視野の広さ</span><strong>{選択個体.遺伝子.視野.toFixed(0)}</strong></div>
              </div>
            )}
          </div>

          <div className="card brain-card">
            <div className="section-heading"><div><h2>脳の動き</h2><p>明るい丸ほど、その神経が強く反応しています。</p></div></div>
            <canvas ref={脳Canvas} width={420} height={280} className="brain-canvas" />
            {選択個体 && <div className="brain-values">
              <div><h3>感じていること</h3>{感覚名.map((名, i) => <span key={名}>{名}<b>{選択個体.最終入力[i].toFixed(2)}</b></span>)}</div>
              <div><h3>行動の候補</h3>{行動名.map((名, i) => <span key={名}>{名}<b>{選択個体.最終出力[i].toFixed(2)}</b></span>)}</div>
            </div>}
          </div>
        </aside>
      </section>

      <section className="bottom-grid">
        <div className="card">
          <div className="section-heading"><div><h2>進化の推移</h2><p>緑＝個体数、青＝到達した世代です。</p></div></div>
          <canvas ref={推移Canvas} width={760} height={220} className="chart-canvas" />
        </div>

        <div className="card log-card">
          <div className="section-heading"><div><h2>できごと</h2><p>新しい世代への到達などを記録します。</p></div></div>
          <div className="event-log">
            {イベント一覧.length === 0 ? <p className="empty">まだできごとはありません。</p> : イベント一覧.map((項目, i) => (
              <div className={`event ${項目.種類}`} key={`${項目.時刻}-${i}`}><time>{項目.時刻.toLocaleString()}</time><span>{項目.内容}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className="card settings-card">
        <div className="section-heading">
          <div><h2>実験条件</h2><p>数字を変えて環境の違いを比較できます。</p></div>
          <div className="preset-row"><button onClick={過酷設定}>餌が少ない過酷な世界</button><button onClick={豊富設定}>餌が豊富な世界</button></div>
        </div>
        <div className="settings-grid">
          <label>最初の個体数<input type="number" value={設定値.初期個体数} onChange={(e) => 設定変更('初期個体数', Number(e.target.value))} /></label>
          <label>最初の餌の数<input type="number" value={設定値.初期餌数} onChange={(e) => 設定変更('初期餌数', Number(e.target.value))} /></label>
          <label>餌の最大数<input type="number" value={設定値.最大餌数} onChange={(e) => 設定変更('最大餌数', Number(e.target.value))} /></label>
          <label>餌1個の回復量<input type="number" value={設定値.餌の回復量} onChange={(e) => 設定変更('餌の回復量', Number(e.target.value))} /></label>
          <label>餌の出現率<input type="number" step="0.01" value={設定値.餌の出現率} onChange={(e) => 設定変更('餌の出現率', Number(e.target.value))} /></label>
          <label>突然変異率<input type="number" step="0.01" value={設定値.突然変異率} onChange={(e) => 設定変更('突然変異率', Number(e.target.value))} /></label>
          <label>突然変異の大きさ<input type="number" step="0.01" value={設定値.突然変異強度} onChange={(e) => 設定変更('突然変異強度', Number(e.target.value))} /></label>
          <label>繁殖に必要なエネルギー<input type="number" value={設定値.繁殖エネルギー閾値} onChange={(e) => 設定変更('繁殖エネルギー閾値', Number(e.target.value))} /></label>
          <label className="wide">乱数シード<input value={設定値.シード} onChange={(e) => 設定変更('シード', e.target.value)} /></label>
        </div>
        <div className="button-row settings-actions"><button className="primary" onClick={() => 新しい実験(設定値, true)}>この条件で始める</button><button onClick={結果保存}>実験結果を保存</button></div>
      </section>

      <section className="explanation card">
        <h2>何が起きているの？</h2>
        <p>各生物は「餌の位置」「他の生物の位置」「自分のエネルギー」など10個の情報を受け取ります。その情報を小さなニューラルネットワークに通して、前進・左右への旋回・食べる、の4つから1つを選びます。</p>
        <p>餌をうまく食べてエネルギーが増えた生物は子供を作ります。子供の脳は親に似ていますが、少しだけ突然変異します。人間が正解を教えなくても、何世代も経つうちに生き残りやすい行動が増えるかを観察できます。</p>
      </section>
    </main>
  )
}

export default App
