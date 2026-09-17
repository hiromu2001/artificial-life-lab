# 要件定義 — Artificial Life Lab

## 1. 目的

Artificial Life Lab は、単純な知覚・行動・エネルギー・繁殖・遺伝ルールを持つ人工生命が、世代交代と突然変異を通じてどのような行動を獲得するか観察するブラウザベースの人工生命シミュレーターである。

本プロジェクトの中心テーマは **Emergence（創発）** とする。

## 2. MVP のゴール

MVP では、人工生命がニューラルネットワークによって行動し、Food を獲得し、生存・繁殖・突然変異を繰り返すことで、世代間の行動変化を観察できる状態を完成条件とする。

MVP では高度な生物学的再現性よりも、以下を優先する。

1. 動作が理解しやすいこと
2. 進化の結果を観察できること
3. 再現可能な実験ができること
4. 将来拡張しやすい構造であること

## 3. システム構成

### 3.1 World

- 2D の有限空間とする
- ブラウザ内で完結する
- Food と Artificial Life を配置する
- MVP では地形・障害物・天候・捕食者を実装しない

### 3.2 Artificial Life

各個体は最低限、以下の状態を持つ。

| 項目 | 内容 |
| --- | --- |
| id | 個体 ID |
| generation | 世代 |
| age | 年齢 |
| energy | エネルギー |
| position | 座標 |
| direction | 向き |
| speed | 移動速度 |
| brain | Neural Network |
| genome | 遺伝情報 |
| parentId | 親個体 ID |
| children | 子孫数 |
| foodEaten | Food 獲得数 |
| cumulativeReward | 観察用累積報酬 |

## 4. Sensor 要件

MVP では以下を Brain の入力として利用する。

### Food Sensor

- 最寄り Food までの距離
- 最寄り Food の相対方向

### Life Sensor

- 最寄り個体までの距離
- 最寄り個体の相対方向

### Internal Sensor

- Energy
- Age

### Noise Sensor

- ランダム値

入力値は可能な限り正規化し、Brain が極端なスケール差を受けないようにする。

## 5. Brain 要件

MVP では Feed Forward Neural Network を使用する。

初期案：

- Input: 8 前後
- Hidden Layer 1: 12
- Hidden Layer 2: 8
- Output: 4

出力候補：

- moveForward
- turnLeft
- turnRight
- eat

最も大きい出力をその tick の基本行動として採用する。

重要事項：

- 「Food が近いなら Food 方向へ向かう」のような正解行動を直接実装しない
- 行動決定は Brain の出力によって行う
- Brain の重みは Genome として遺伝対象にする

## 6. Energy 要件

各行動で Energy を消費する。

初期値例：

- Idle: -0.01
- Turn: -0.03
- Move: -0.10
- Eat success: Food の設定値分だけ Energy 回復

Energy が 0 以下になった個体は死亡する。

具体値は設定可能にし、後から調整できるようにする。

## 7. Food 要件

- World 内にランダム生成する
- Food Spawn Rate を設定可能にする
- Food Energy を設定可能にする
- Max Food を設定可能にする
- MVP では一様ランダム配置のみ対応する

## 8. Reproduction 要件

一定条件を満たした個体は子個体を生成する。

初期条件例：

- age >= minimumReproductionAge
- energy >= reproductionThreshold

繁殖時：

- 親の Genome をコピーする
- 親の generation + 1 を子の generation とする
- 親の Energy の一部を繁殖コストとして消費する
- Mutation を適用する

MVP では無性生殖とする。

## 9. Mutation 要件

Brain Weight に対して確率的変異を加える。

概念式：

```text
childWeight = parentWeight + GaussianNoise(0, mutationStrength)
```

設定可能項目：

- Mutation Rate
- Mutation Strength

MVP では主に Brain Weight を対象とする。

将来的には以下も対象候補とする。

- Vision Range
- Speed
- Energy Efficiency
- Brain topology
- Memory capacity

## 10. Natural Selection 方針

明示的な Fitness Score 順ランキングによる選抜は行わない。

World 内で、

1. 生存する
2. Food を獲得する
3. 繁殖する
4. 子孫を残す

ことができた Genome が結果的に増える方式を基本とする。

統計・観察用のスコアを計測することは許容するが、そのスコアで直接生存個体を選抜しない。

## 11. Simulation Tick

1 tick の処理順は原則以下とする。

1. Sense
2. Brain inference
3. Action decision
4. Action execution
5. Energy consumption
6. Environment update
7. Death check
8. Reproduction check
9. Statistics update

計算ロジックは描画処理と分離する。

## 12. UI 要件

### 12.1 Main World

- Canvas 上に World を描画する
- Life の向きが分かる形状にする
- Food を視認できるようにする
- 個体クリックを可能にする

### 12.2 Top Status

最低限表示：

- Population
- Simulation Tick
- Max Generation
- Food Count
- Simulation Speed

### 12.3 Life Inspector

選択個体について以下を表示する。

- ID
- Generation
- Age
- Energy
- Children
- Food Eaten
- Parent ID
- Speed
- Vision Range（実装する場合）

### 12.4 Brain Viewer

選択個体の Brain を可視化する。

最低限：

- Input node
- Hidden node
- Output node
- 現在の活性値
- 選択された Action

Brain Viewer は本プロジェクトの主要 UI とする。

### 12.5 Statistics

最低限計測：

- Population
- Births
- Deaths
- Max Generation
- Average Age
- Average Energy
- Food Consumed

時系列グラフ：

- Population
- Max Generation
- Average Lifespan または Average Age

## 13. Simulation Controls

必須：

- Start
- Pause
- Reset
- Simulation Speed 切替

速度候補：

- 0.5x
- 1x
- 2x
- 5x
- 10x
- MAX

高速時は描画頻度を落とし、Simulation Engine 自体の tick 数を優先する。

## 14. Settings

最低限ユーザーが変更可能にする。

- Initial Population
- Food Spawn Rate
- Food Energy
- Max Food
- Mutation Rate
- Mutation Strength
- Energy Consumption
- Reproduction Threshold
- Random Seed

## 15. Random Seed / 再現性

- 擬似乱数生成器を一元管理する
- Seed を指定可能にする
- 同一バージョン・同一設定・同一 Seed で可能な限り同一結果を再現できるようにする

保存対象：

- Seed
- Simulation Settings
- Application Version

## 16. Save / Load

MVP 後半または v0.2 までに JSON 保存を実装する。

保存候補：

- World state
- Life state
- Genome / Brain weights
- Food
- Statistics
- Seed
- Settings
- Simulation tick

## 17. Architecture

Simulation Engine と UI を分離する。

想定構造：

```text
src/
  simulation/
    World
    Life
    Brain
    Genome
    Food
    Mutation
    Reproduction
    Random
    Statistics
  rendering/
    WorldRenderer
    BrainRenderer
  ui/
    Controls
    LifeInspector
    StatisticsPanel
    SettingsPanel
  experiments/
```

Simulation Engine は React に依存させない。

## 18. 技術スタック

初期候補：

- TypeScript
- React
- Vite
- HTML Canvas
- Zustand
- Recharts

MVP ではバックエンドを利用しない。

## 19. Performance 要件

目標：

- 200 個体程度で通常観察モードが快適に動作すること
- Fast Simulation では描画頻度を落とし、より多数の個体・tick を処理できること
- Simulation と Rendering の負荷を個別に計測できる設計にすること

60 FPS は目標値であり、進化計算を犠牲にしてまで固定要件とはしない。

## 20. MVP Acceptance Criteria

以下をすべて満たした時点を MVP 完成とする。

- [ ] ブラウザで起動できる
- [ ] 100体以上の個体を生成できる
- [ ] 個体が Brain 出力で行動する
- [ ] Food を感知できる
- [ ] Food を摂取できる
- [ ] 行動によって Energy が減少する
- [ ] Energy 0 で死亡する
- [ ] 条件を満たすと繁殖する
- [ ] Brain Weight が子へ遺伝する
- [ ] Mutation が発生する
- [ ] Generation を追跡できる
- [ ] 個体をクリックして詳細を表示できる
- [ ] Brain Activity を表示できる
- [ ] Population の時系列を表示できる
- [ ] Simulation Speed を変更できる
- [ ] Random Seed を指定できる
- [ ] Reset できる

## 21. MVP の範囲外

MVP には含めない。

- 捕食
- 戦闘
- 性別
- Sexual Selection
- Sexual Reproduction
- Genetic Crossover
- 群れ判定
- 記憶
- Reinforcement Learning
- Spiking Neural Network
- Communication
- Language
- Terrain
- Weather
- Disease
- NEAT
- 実昆虫 Connectome

## 22. 検証したい問い

MVP 完成後、最低限以下を実験する。

1. ランダム初期化された Brain から Food 獲得効率は世代とともに変化するか
2. Mutation Rate の違いで集団維持率・絶滅率・世代到達速度はどう変わるか
3. Food の希少性によって行動傾向は変わるか
4. Energy Cost によって移動量や寿命はどう変化するか
5. 複数 Seed で同様の傾向が再現するか

単一実行の見た目だけで「知能が生まれた」「進化した」と断定せず、複数 Seed と統計量を使って評価する。
