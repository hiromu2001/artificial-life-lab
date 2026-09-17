# Roadmap — Artificial Life Lab

## Phase 0 — Project Foundation

目的：開発を始められる最小構成を作る。

- [ ] Vite + React + TypeScript セットアップ
- [ ] Simulation Engine と UI のディレクトリ分離
- [ ] Seeded Random 実装
- [ ] 基本型定義
- [ ] 開発用の簡易テスト環境

完了条件：空の World をブラウザで描画し、Simulation Tick を開始・停止できる。

---

## Phase 1 — MVP: Life, Food, Evolution

目的：進化が成立する最小の人工生命系を完成させる。

### World

- [ ] 2D World
- [ ] Food の生成・消滅
- [ ] Life の生成・死亡

### Life

- [ ] position / direction / age / energy
- [ ] move / turn / eat
- [ ] Energy 消費
- [ ] Energy 0 による死亡

### Brain

- [ ] Feed Forward Neural Network
- [ ] Sensor 入力
- [ ] Action 出力
- [ ] Brain Weight の Genome 化

### Evolution

- [ ] Reproduction
- [ ] Genome inheritance
- [ ] Mutation
- [ ] Generation tracking

### UI

- [ ] Canvas Renderer
- [ ] Start / Pause / Reset
- [ ] Simulation Speed
- [ ] Life Inspector
- [ ] Brain Viewer
- [ ] Population Graph
- [ ] 基本 Statistics

### Reproducibility

- [ ] Random Seed 指定
- [ ] 設定値の固定・再実行

完了条件：ランダム初期化された集団が Food を巡って生存・死亡・繁殖し、複数世代を観察できる。

---

## Phase 2 — Ecology

目的：単純な採餌だけではない選択圧を導入する。

- [ ] Predator / Prey
- [ ] Attack / Defense
- [ ] Vision Range の遺伝
- [ ] Speed の遺伝
- [ ] Energy Efficiency の遺伝
- [ ] Terrain
- [ ] Resource patches
- [ ] Day / Night
- [ ] Population collapse detection
- [ ] Genome diversity metrics

観察候補：

- 回避行動
- 追跡行動
- 資源集中地点への適応
- 生態的ニッチの分化

---

## Phase 3 — Species & Social Behavior

目的：個体間相互作用から集団行動が生まれる条件を作る。

- [ ] Genetic Crossover
- [ ] Sexual Reproduction
- [ ] Mate selection
- [ ] Species / lineage tracking
- [ ] Kin recognition の実験
- [ ] Communication signal
- [ ] Social sensor
- [ ] 群れ指標
- [ ] Social distance 指標

観察候補：

- 群れ
- 分散
- 縄張り
- 配偶戦略
- 協力・競争

---

## Phase 4 — Learning & Memory

目的：世代間進化だけでなく、個体の生涯中の学習を導入する。

- [ ] Recurrent Neural Network
- [ ] Memory state
- [ ] Reward signal
- [ ] Reinforcement Learning の実験
- [ ] Hebbian Learning
- [ ] Learned behavior と inherited behavior の比較

主要な問い：

> 「進化で獲得する能力」と「生涯学習で獲得する能力」は、どの環境条件で使い分けられるか。

---

## Phase 5 — Evolving Brains

目的：Brain の Weight だけでなく構造そのものを進化させる。

- [ ] Brain topology mutation
- [ ] Node mutation
- [ ] Connection mutation
- [ ] NEAT または類似手法
- [ ] Brain complexity metrics
- [ ] Complexity cost

観察候補：

- 脳サイズの増加
- 複雑な Brain が本当に有利になる条件
- 計算コストと適応能力のトレードオフ

---

## Phase 6 — Neuroscience Mode

目的：抽象的ニューラルネットワークから、より神経科学寄りのモデルへ拡張する。

- [ ] Spiking Neural Network
- [ ] Membrane potential visualization
- [ ] STDP
- [ ] Neuromodulation
- [ ] Dopamine-like reward modulation
- [ ] Neural activity recording

この Phase では、生物学的モデルと単純化された人工生命モデルを混同しないよう、モードを明確に分離する。

---

## Phase 7 — Connectome Experiments

目的：公開されている昆虫神経回路データなどを参考に、実データ由来の神経構造を仮想環境へ接続する可能性を検討する。

候補：

- [ ] Connectome data importer
- [ ] Neuron / synapse mapping
- [ ] Sensor mapping
- [ ] Motor output mapping
- [ ] Simplification layer
- [ ] Synthetic Brain との比較実験

注意：Connectome が存在することと、そのまま完全な動物行動を再現できることは同義ではない。神経モデル、身体、感覚入力、神経修飾、学習則などの不足を明示する。

---

## Phase 8 — Experimental Platform

目的：単なるシミュレーターから、再現可能な人工生命実験基盤へ発展させる。

- [ ] Experiment presets
- [ ] Batch simulations
- [ ] Multi-seed experiments
- [ ] Metric comparison
- [ ] JSON / CSV export
- [ ] Save / Load
- [ ] Experiment A/B comparison
- [ ] Emergent behavior metrics
- [ ] Shareable experiment configuration

最終的には、

**Artificial Life × Evolution × Neural Networks × Learning × Visualization × Reproducible Experiments**

を統合したブラウザベースの Artificial Life Laboratory を目指す。
