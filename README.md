# Artificial Life Lab

> シンプルなルールから知性が生まれる過程を観察する、ニューラルネットワーク・進化・自然選択を用いたブラウザベースの人工生命シミュレーター。

## ▶ Play

**[ブラウザで Artificial Life Lab を起動](https://raw.githack.com/hiromu2001/artificial-life-lab/main/index.html)**

または、このリポジトリをClone / Downloadして `index.html` をブラウザで開くだけで動作します。ビルドやnpm installは不要です。

## 現在できること

- 100体以上の人工生命をリアルタイムシミュレーション
- 各個体が独自のFeed Forward Neural Networkで行動を決定
- Food / 他個体 / Energy / Age / Noiseをセンサー入力として利用
- MOVE / LEFT / RIGHT / EATをBrain出力から選択
- Food摂取によるEnergy回復
- Energy消費と死亡
- 無性生殖と世代交代
- Neural Network Weight / Speed / Vision / Efficiencyの遺伝
- Gaussian Mutationによる突然変異
- 明示的なFitness Rankingを使わない自然選択
- Random Seedによる再現可能な実験
- 個体クリックによるLife Inspector
- ニューロン活性と結合WeightのBrain Viewer
- Population / Generationのリアルタイムグラフ
- Births / Deaths / Food consumedの統計
- 0.5× / 1× / 5× / 20× / MAXの高速シミュレーション
- Mutation Rateなどの実験条件変更
- 実験結果のJSONエクスポート
- 絶滅検出と進化イベントログ

## 概要

Artificial Life Lab は、人工生命に最低限の知覚・行動・エネルギー・繁殖・遺伝の仕組みだけを与え、世代交代の中でどのような行動が自然に生まれるかを観察する実験プラットフォームです。

「食料があれば近づく」といった正解行動は直接プログラムしていません。各個体はセンサー入力をニューラルネットワークで処理し、その出力によってのみ行動します。生存して繁殖した個体のBrainと身体特性が次世代に受け継がれ、Mutationによって少しずつ変化します。

```text
Environment
    ↓
Sensors
    ↓
Neural Network
    ↓
Action
    ↓
Energy / Survival / Reproduction
    ↓
Genome inheritance + Mutation
    ↓
Next generation
```

## 操作方法

1. ページを開くと自動でSimulationが開始します。
2. 三角形の個体をクリックすると、その個体のEnergy・世代・Brain Activityを観察できます。
3. `速度` を `MAX` にすると進化を高速で進められます。
4. Mutation Rate、Food量、繁殖閾値、Seedなどを変更して `リセット` すると別条件の実験を開始できます。
5. `実験JSONを書き出す` から統計データを保存できます。

## Genome

現在は以下の情報が遺伝します。

- Neural Network weights / biases
- Speed
- Vision range
- Energy efficiency
- Lineage color

子個体では設定したMutation Rateに応じてGenomeが変異します。

## Brain

MVPのBrain構造は以下です。

```text
10 Sensors
   ↓
12 neurons
   ↓
8 neurons
   ↓
4 Actions
```

Action:

- MOVE
- LEFT
- RIGHT
- EAT

Brain Viewerでは各ニューロンの活性値と、正負の結合Weightをリアルタイムに確認できます。

## 設計原則

### 行動を直接教えない

Foodが近いからFood方向へ移動する、といったルールは実装しません。環境情報はSensorとして渡すだけで、行動はBrainが決定します。

### 明示的な選抜を行わない

Fitness Score順に上位個体を残す方式ではなく、環境内でFoodを獲得し、生存し、繁殖できたGenomeが自然に増える方式です。

### 再現可能にする

Random Seedを指定できるため、同一設定・同一Seedの実験を比較できます。

## 技術構成

現在のPlayable MVPは依存ライブラリなしのStatic Web Appです。

- HTML Canvas
- Vanilla JavaScript
- CSS
- GitHub ActionsによるJavaScript構文チェック

ビルド環境を不要にすることで、リポジトリを取得してすぐ実験できる構成にしています。

## ドキュメント

- [要件定義](./REQUIREMENTS.md)
- [ロードマップ](./ROADMAP.md)

## Next

次の候補は、捕食者・攻撃/防御・記憶・性選択・種分化・遺伝的交叉・NEAT・RNN・Spiking Neural Network・ドーパミン・STDPです。

最終的には、

> 生命に最低限の知覚・身体・報酬・遺伝だけを与えたとき、どこまで複雑な行動が自然に生まれるのか。

を実験できるArtificial Life Laboratoryを目指します。

## Status

**Playable MVP**

Artificial Life × Evolution × Neural Networks × Emergence
