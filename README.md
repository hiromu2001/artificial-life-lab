# Artificial Life Lab

> シンプルなルールから知性が生まれる過程を観察する、ニューラルネットワーク・進化・自然選択を用いたブラウザベースの人工生命シミュレーター。

## 概要

Artificial Life Lab は、人工生命に最低限の知覚・行動・エネルギー・繁殖・遺伝の仕組みだけを与え、世代交代の中でどのような行動が自然に生まれるかを観察する実験プラットフォームです。

「食料があれば近づく」「危険なら逃げる」といった正解行動は直接プログラムしません。各個体はセンサー入力を小さなニューラルネットワークで処理し、その出力だけで行動します。生き残って繁殖した個体の脳パラメータが次世代に受け継がれ、突然変異によって少しずつ変化します。

## このプロジェクトで見たいもの

- 採餌行動が自然に進化するか
- 無駄な移動が減り、エネルギー効率が改善するか
- 世代を重ねることで生存時間が伸びるか
- 将来的に、群れ・回避・攻撃性・記憶・コミュニケーションなどが創発するか

## MVP

最初のバージョンでは、以下を実装します。

- 2Dワールド
- Food のランダム生成
- 100体以上の人工生命
- Food / 他個体 / Energy / Age などのセンサー
- 小規模 Feed Forward Neural Network
- 前進・旋回・摂食
- 行動による Energy 消費
- Energy 0 による死亡
- 条件を満たした個体の繁殖
- Brain Weight の遺伝
- Mutation
- Generation の追跡
- 個体クリックによる詳細表示
- Brain Activity の可視化
- Population / Generation などの統計表示
- Simulation Speed の変更
- Random Seed による再現

## 設計原則

### 1. 行動を直接教えない

「食料へ移動する」などのルールを if 文で実装せず、個体は Brain の出力だけで行動します。

### 2. 自然選択を環境側で起こす

明示的なランキングで個体を選抜せず、長く生存して繁殖できた個体の Genome が自然に増える構造にします。

### 3. シミュレーションと描画を分離する

Simulation Engine は React や描画処理に依存させず、高速シミュレーションや将来の実験モードに拡張しやすい構造にします。

### 4. 再現可能にする

Seed・設定値・バージョンを保存し、同じ条件で実験を再現できるようにします。

## 想定技術スタック

- TypeScript
- React
- Vite
- HTML Canvas
- Zustand
- Recharts

MVP ではバックエンドを持たず、ブラウザ内で完結させます。

## ドキュメント

- [要件定義](./REQUIREMENTS.md)
- [ロードマップ](./ROADMAP.md)

## 将来像

MVP の後は、捕食・記憶・種分化・性選択・遺伝的交叉・NEAT・Recurrent Neural Network・Spiking Neural Network・ドーパミン・STDP などへ段階的に拡張します。

最終的には、

> 生命に最低限の知覚・身体・報酬・遺伝だけを与えたとき、どこまで複雑な行動が自然に生まれるのか。

をブラウザ上で実験できる Artificial Life Laboratory を目指します。

## Status

🚧 Planning / MVP design

---

Artificial Life × Evolution × Neural Networks × Visualization
