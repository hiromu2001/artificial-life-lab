export type 行動 = '前進' | '左旋回' | '右旋回' | '食べる'

export type 設定 = {
  初期個体数: number
  初期餌数: number
  最大餌数: number
  餌の回復量: number
  餌の出現率: number
  突然変異率: number
  突然変異強度: number
  繁殖エネルギー閾値: number
  シード: string
}

export type 履歴 = {
  時刻: number
  個体数: number
  最大世代: number
  平均年齢: number
  平均エネルギー: number
}

export type 統計 = {
  出生数: number
  死亡数: number
  食べた餌数: number
  最大世代: number
  平均年齢: number
  平均エネルギー: number
  履歴: 履歴[]
}

export type イベント = {
  時刻: number
  内容: string
  種類: '通常' | '節目' | '警告'
}

type 点 = { x: number; y: number }

type 脳遺伝子 = {
  層: number[]
  重み: number[][]
  バイアス: number[][]
  速度: number
  視野: number
  効率: number
  色相: number
}

export type 餌 = 点 & { id: number; 大きさ: number }

const 全周 = Math.PI * 2
const 制限 = (値: number, 最小: number, 最大: number) => Math.max(最小, Math.min(最大, 値))

function 文字列ハッシュ(文字列: string) {
  let h = 1779033703 ^ 文字列.length
  for (let i = 0; i < 文字列.length; i++) {
    h = Math.imul(h ^ 文字列.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

class 乱数生成器 {
  private 状態: number
  private 正規乱数予備: number | null = null

  constructor(シード: string) {
    const 生成 = 文字列ハッシュ(シード)
    this.状態 = 生成()
  }

  次(): number {
    let t = (this.状態 += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  範囲(最小: number, 最大: number) {
    return 最小 + (最大 - 最小) * this.次()
  }

  整数(最小: number, 最大: number) {
    return Math.floor(this.範囲(最小, 最大 + 1))
  }

  正規(): number {
    if (this.正規乱数予備 !== null) {
      const 値 = this.正規乱数予備
      this.正規乱数予備 = null
      return 値
    }
    let u = 0
    let v = 0
    while (u === 0) u = this.次()
    while (v === 0) v = this.次()
    const 大きさ = Math.sqrt(-2 * Math.log(u))
    const 角度 = 全周 * v
    this.正規乱数予備 = 大きさ * Math.sin(角度)
    return 大きさ * Math.cos(角度)
  }
}

export class ニューラルネットワーク {
  層: number[]
  重み: number[][]
  バイアス: number[][]
  活性値: number[][] = []

  constructor(遺伝子: 脳遺伝子) {
    this.層 = [...遺伝子.層]
    this.重み = 遺伝子.重み.map((層) => [...層])
    this.バイアス = 遺伝子.バイアス.map((層) => [...層])
  }

  static ランダム生成(乱数: 乱数生成器, 層 = [10, 12, 8, 4]) {
    const 重み: number[][] = []
    const バイアス: number[][] = []
    for (let l = 0; l < 層.length - 1; l++) {
      const 入力数 = 層[l]
      const 出力数 = 層[l + 1]
      const 尺度 = Math.sqrt(2 / Math.max(1, 入力数))
      const w = new Array(入力数 * 出力数)
      const b = new Array(出力数)
      for (let i = 0; i < w.length; i++) w[i] = 乱数.正規() * 尺度
      for (let i = 0; i < b.length; i++) b[i] = 乱数.正規() * 0.15
      重み.push(w)
      バイアス.push(b)
    }
    return { 層, 重み, バイアス }
  }

  推論(入力: number[]) {
    let 現在 = [...入力]
    this.活性値 = [[...現在]]
    for (let l = 0; l < this.重み.length; l++) {
      const 入力数 = this.層[l]
      const 出力数 = this.層[l + 1]
      const 出力 = new Array(出力数).fill(0)
      for (let j = 0; j < 出力数; j++) {
        let 合計 = this.バイアス[l][j]
        const 開始 = j * 入力数
        for (let i = 0; i < 入力数; i++) 合計 += 現在[i] * this.重み[l][開始 + i]
        出力[j] = l === this.重み.length - 1 ? 1 / (1 + Math.exp(-合計)) : Math.tanh(合計)
      }
      現在 = 出力
      this.活性値.push([...出力])
    }
    return 現在
  }
}

function ランダム遺伝子(乱数: 乱数生成器): 脳遺伝子 {
  const 脳 = ニューラルネットワーク.ランダム生成(乱数)
  return {
    層: 脳.層,
    重み: 脳.重み,
    バイアス: 脳.バイアス,
    速度: 乱数.範囲(1, 2.35),
    視野: 乱数.範囲(75, 155),
    効率: 乱数.範囲(0.88, 1.12),
    色相: 乱数.整数(120, 205),
  }
}

function 突然変異(親: 脳遺伝子, 乱数: 乱数生成器, 率: number, 強度: number): 脳遺伝子 {
  const 子: 脳遺伝子 = {
    層: [...親.層],
    重み: 親.重み.map((層) => [...層]),
    バイアス: 親.バイアス.map((層) => [...層]),
    速度: 親.速度,
    視野: 親.視野,
    効率: 親.効率,
    色相: 親.色相,
  }
  子.重み.forEach((層) => {
    for (let i = 0; i < 層.length; i++) if (乱数.次() < 率) 層[i] += 乱数.正規() * 強度
  })
  子.バイアス.forEach((層) => {
    for (let i = 0; i < 層.length; i++) if (乱数.次() < 率) 層[i] += 乱数.正規() * 強度
  })
  if (乱数.次() < 率) 子.速度 = 制限(子.速度 + 乱数.正規() * 強度 * 0.5, 0.65, 3.4)
  if (乱数.次() < 率) 子.視野 = 制限(子.視野 + 乱数.正規() * 強度 * 35, 45, 240)
  if (乱数.次() < 率) 子.効率 = 制限(子.効率 + 乱数.正規() * 強度 * 0.08, 0.72, 1.35)
  if (乱数.次() < 率 * 0.6) 子.色相 = (子.色相 + 乱数.正規() * 14 + 360) % 360
  return 子
}

function 角度を整える(角度: number) {
  while (角度 > Math.PI) 角度 -= 全周
  while (角度 < -Math.PI) 角度 += 全周
  return 角度
}

export class 個体 implements 点 {
  id: number
  x: number
  y: number
  向き: number
  世代: number
  親id: number | null
  遺伝子: 脳遺伝子
  脳: ニューラルネットワーク
  エネルギー: number
  年齢 = 0
  子供数 = 0
  食べた餌数 = 0
  最終行動: 行動 = '前進'
  最終出力 = [0, 0, 0, 0]
  最終入力 = new Array(10).fill(0)
  繁殖待機 = 0
  生存中 = true

  constructor(
    世界: シミュレーション,
    初期値: Partial<{
      x: number
      y: number
      向き: number
      世代: number
      親id: number | null
      遺伝子: 脳遺伝子
      エネルギー: number
    }> = {},
  ) {
    this.id = 世界.次個体id++
    this.x = 初期値.x ?? 世界.乱数.範囲(12, 世界.幅 - 12)
    this.y = 初期値.y ?? 世界.乱数.範囲(12, 世界.高さ - 12)
    this.向き = 初期値.向き ?? 世界.乱数.範囲(-Math.PI, Math.PI)
    this.世代 = 初期値.世代 ?? 0
    this.親id = 初期値.親id ?? null
    this.遺伝子 = 初期値.遺伝子 ?? ランダム遺伝子(世界.乱数)
    this.脳 = new ニューラルネットワーク(this.遺伝子)
    this.エネルギー = 初期値.エネルギー ?? 世界.乱数.範囲(85, 110)
  }

  private 最寄り<T extends 点>(候補: T[], 視野: number, 自分除外 = false) {
    let 最良: T | null = null
    let 最短二乗 = 視野 * 視野
    for (const 項目 of 候補) {
      if (自分除外 && (項目 as unknown) === this) continue
      const dx = 項目.x - this.x
      const dy = 項目.y - this.y
      const 距離二乗 = dx * dx + dy * dy
      if (距離二乗 < 最短二乗) {
        最短二乗 = 距離二乗
        最良 = 項目
      }
    }
    return 最良 ? { 項目: 最良, 距離: Math.sqrt(最短二乗) } : null
  }

  private 感知(世界: シミュレーション) {
    const 視野 = this.遺伝子.視野
    const 餌 = this.最寄り(世界.餌一覧, 視野)
    const 他個体 = this.最寄り(世界.個体一覧, 視野, true)

    let 餌あり = 0
    let 餌近さ = 0
    let 餌方向sin = 0
    let 餌方向cos = 0
    if (餌) {
      餌あり = 1
      餌近さ = 1 - 餌.距離 / 視野
      const 角度 = 角度を整える(Math.atan2(餌.項目.y - this.y, 餌.項目.x - this.x) - this.向き)
      餌方向sin = Math.sin(角度)
      餌方向cos = Math.cos(角度)
    }

    let 個体近さ = 0
    let 個体方向sin = 0
    let 個体方向cos = 0
    if (他個体) {
      個体近さ = 1 - 他個体.距離 / 視野
      const 角度 = 角度を整える(Math.atan2(他個体.項目.y - this.y, 他個体.項目.x - this.x) - this.向き)
      個体方向sin = Math.sin(角度)
      個体方向cos = Math.cos(角度)
    }

    return [
      餌あり,
      餌近さ,
      餌方向sin,
      餌方向cos,
      個体近さ,
      個体方向sin,
      個体方向cos,
      制限(this.エネルギー / 200, 0, 1),
      制限(this.年齢 / 5000, 0, 1),
      世界.乱数.範囲(-1, 1),
    ]
  }

  更新(世界: シミュレーション) {
    this.年齢++
    if (this.繁殖待機 > 0) this.繁殖待機--

    this.最終入力 = this.感知(世界)
    this.最終出力 = this.脳.推論(this.最終入力)
    let 行動番号 = 0
    for (let i = 1; i < this.最終出力.length; i++) if (this.最終出力[i] > this.最終出力[行動番号]) 行動番号 = i

    const 効率 = this.遺伝子.効率
    this.エネルギー -= 0.025 * 効率

    if (行動番号 === 0) {
      this.最終行動 = '前進'
      const 速度 = this.遺伝子.速度 * (0.6 + this.最終出力[0] * 0.7)
      this.x += Math.cos(this.向き) * 速度
      this.y += Math.sin(this.向き) * 速度
      this.エネルギー -= 0.055 * 効率 * 速度
    } else if (行動番号 === 1) {
      this.最終行動 = '左旋回'
      this.向き -= 0.07 + this.最終出力[1] * 0.11
      this.エネルギー -= 0.026 * 効率
    } else if (行動番号 === 2) {
      this.最終行動 = '右旋回'
      this.向き += 0.07 + this.最終出力[2] * 0.11
      this.エネルギー -= 0.026 * 効率
    } else {
      this.最終行動 = '食べる'
      this.エネルギー -= 0.018 * 効率
      this.食べる(世界)
    }

    if (this.x < 0) this.x += 世界.幅
    if (this.x >= 世界.幅) this.x -= 世界.幅
    if (this.y < 0) this.y += 世界.高さ
    if (this.y >= 世界.高さ) this.y -= 世界.高さ
    this.向き = 角度を整える(this.向き)

    if (this.エネルギー > 世界.設定.繁殖エネルギー閾値 && this.年齢 > 220 && this.繁殖待機 <= 0) 世界.繁殖(this)
    if (this.エネルギー <= 0 || this.年齢 > 10000) this.生存中 = false
  }

  private 食べる(世界: シミュレーション) {
    let 対象 = -1
    let 最短二乗 = 14 * 14
    for (let i = 0; i < 世界.餌一覧.length; i++) {
      const 餌 = 世界.餌一覧[i]
      const dx = 餌.x - this.x
      const dy = 餌.y - this.y
      const 距離二乗 = dx * dx + dy * dy
      if (距離二乗 < 最短二乗) {
        最短二乗 = 距離二乗
        対象 = i
      }
    }
    if (対象 >= 0) {
      世界.餌一覧.splice(対象, 1)
      this.食べた餌数++
      世界.統計.食べた餌数++
      this.エネルギー = Math.min(230, this.エネルギー + 世界.設定.餌の回復量)
    }
  }
}

export class シミュレーション {
  幅: number
  高さ: number
  設定: 設定
  乱数: 乱数生成器
  次個体id = 1
  次餌id = 1
  時刻 = 0
  個体一覧: 個体[] = []
  餌一覧: 餌[] = []
  統計: 統計
  private 通知: (イベント: イベント) => void

  constructor(幅: number, 高さ: number, 設定値: 設定, 通知: (イベント: イベント) => void) {
    this.幅 = 幅
    this.高さ = 高さ
    this.設定 = { ...設定値 }
    this.乱数 = new 乱数生成器(設定値.シード)
    this.統計 = this.空統計()
    this.通知 = 通知
    this.リセット(設定値)
  }

  private 空統計(): 統計 {
    return { 出生数: 0, 死亡数: 0, 食べた餌数: 0, 最大世代: 0, 平均年齢: 0, 平均エネルギー: 0, 履歴: [] }
  }

  リセット(設定値: 設定) {
    this.設定 = { ...設定値 }
    this.乱数 = new 乱数生成器(設定値.シード)
    this.次個体id = 1
    this.次餌id = 1
    this.時刻 = 0
    this.個体一覧 = []
    this.餌一覧 = []
    this.統計 = this.空統計()
    for (let i = 0; i < 設定値.初期個体数; i++) this.個体一覧.push(new 個体(this))
    for (let i = 0; i < 設定値.初期餌数; i++) this.餌を出す()
    this.履歴追加()
    this.通知({ 時刻: this.時刻, 内容: `実験開始：${設定値.初期個体数}個体・シード「${設定値.シード}」`, 種類: '節目' })
  }

  餌を出す() {
    if (this.餌一覧.length >= this.設定.最大餌数) return
    this.餌一覧.push({
      id: this.次餌id++,
      x: this.乱数.範囲(6, this.幅 - 6),
      y: this.乱数.範囲(6, this.高さ - 6),
      大きさ: this.乱数.範囲(2.2, 4.3),
    })
  }

  繁殖(親: 個体) {
    if (this.個体一覧.length >= 1200) return
    親.エネルギー -= 58
    親.子供数++
    親.繁殖待機 = 180
    const 遺伝子 = 突然変異(親.遺伝子, this.乱数, this.設定.突然変異率, this.設定.突然変異強度)
    const 子 = new 個体(this, {
      x: 親.x + this.乱数.範囲(-12, 12),
      y: 親.y + this.乱数.範囲(-12, 12),
      向き: 親.向き + this.乱数.範囲(-0.5, 0.5),
      世代: 親.世代 + 1,
      親id: 親.id,
      遺伝子,
      エネルギー: 64,
    })
    if (子.x < 0) 子.x += this.幅
    if (子.x >= this.幅) 子.x -= this.幅
    if (子.y < 0) 子.y += this.高さ
    if (子.y >= this.高さ) 子.y -= this.高さ
    this.個体一覧.push(子)
    this.統計.出生数++
  }

  進める() {
    this.時刻++
    if (this.乱数.次() < this.設定.餌の出現率) this.餌を出す()
    if (this.餌一覧.length < this.設定.初期餌数 * 0.35 && this.乱数.次() < 0.35) this.餌を出す()

    const 更新前個体数 = this.個体一覧.length
    const 更新前出生数 = this.統計.出生数
    const 今いる個体 = [...this.個体一覧]
    for (const 個体 of 今いる個体) if (個体.生存中) 個体.更新(this)
    this.個体一覧 = this.個体一覧.filter((個体) => 個体.生存中)

    const 今回出生 = this.統計.出生数 - 更新前出生数
    const 今回死亡 = 更新前個体数 + 今回出生 - this.個体一覧.length
    if (今回死亡 > 0) this.統計.死亡数 += 今回死亡

    let 年齢合計 = 0
    let エネルギー合計 = 0
    let 最大世代 = 0
    for (const 個体 of this.個体一覧) {
      年齢合計 += 個体.年齢
      エネルギー合計 += 個体.エネルギー
      最大世代 = Math.max(最大世代, 個体.世代)
    }
    this.統計.平均年齢 = this.個体一覧.length ? 年齢合計 / this.個体一覧.length : 0
    this.統計.平均エネルギー = this.個体一覧.length ? エネルギー合計 / this.個体一覧.length : 0

    if (最大世代 > this.統計.最大世代) {
      this.統計.最大世代 = 最大世代
      if (最大世代 <= 10 || 最大世代 % 10 === 0) {
        this.通知({ 時刻: this.時刻, 内容: `第${最大世代}世代に到達`, 種類: '節目' })
      }
    }

    if (this.時刻 % 20 === 0) this.履歴追加()
    if (this.個体一覧.length === 0) this.通知({ 時刻: this.時刻, 内容: '全個体が死亡しました。設定を変えて再挑戦してください。', 種類: '警告' })
  }

  private 履歴追加() {
    this.統計.履歴.push({
      時刻: this.時刻,
      個体数: this.個体一覧.length,
      最大世代: this.統計.最大世代,
      平均年齢: this.統計.平均年齢,
      平均エネルギー: this.統計.平均エネルギー,
    })
    if (this.統計.履歴.length > 600) this.統計.履歴.shift()
  }
}

export const 標準設定: 設定 = {
  初期個体数: 120,
  初期餌数: 320,
  最大餌数: 500,
  餌の回復量: 48,
  餌の出現率: 0.18,
  突然変異率: 0.08,
  突然変異強度: 0.18,
  繁殖エネルギー閾値: 155,
  シード: 'emergence-001',
}

export const 数値制限 = 制限
export const 二周率 = 全周
