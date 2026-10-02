# dsh-emil-skills

[English](#english) | 中文

把 [Emil Kowalski 的 skills](https://github.com/emilkowalski/skills)（面向设计师与工程师的界面/动效技能集）
打包成一个 **DeepSeek Harness 插件**（DSH bundle plugin）。装上之后，Harness 里的 Agent 会在合适的时机自动
调用这些技能——判断该不该做动画、选哪条缓动曲线、为什么这个界面"差点意思"，以及怎么把 Web 应用做出 App 的手感。

- 插件名：`dsh-emil-skills`
- 类型：DSH bundle（`package.json` 里声明 `dsh.bundle.patch`）
- 零依赖、零构建步骤：只用 `node:` 内置模块，装完即用
- 上游内容逐字节 vendored，并用 `vendor-manifest.json` 记录 SHA-256

---

## 安装

### 1. 从本地目录安装（开发/自用）

```bash
dsh plugin --profile desktop add link:/绝对路径/dsh-emil-skills
```

### 2. 从 GitHub 安装（无需克隆）

```bash
dsh plugin --profile desktop add github:Inceptzws/dsh-emil-skills
```

> 本仓库已发布在 <https://github.com/Inceptzws/dsh-emil-skills>。包内没有依赖、也没有
> `prepare` 构建脚本，所以 pnpm 不会要求 `allowBuilds` 批准。

### 3. 在 Harness 里用插件管理页 / `plugin_manager`

在 Web 侧边栏的 **Plugins** 页面选择 **Install bundle**，target 填本目录的绝对路径；
或让 Agent 调用 `plugin_manager` 的 `install_bundle`（需要 danger-full-access 或逐次批准）。

> 安装会把 `dsh-emil-skills` 写入 profile 的依赖并选中它的 bundle，重启后依然生效。
> 因为不声明任何依赖、也没有 `prepare`/构建脚本，pnpm 不会要求 `allowBuilds` 批准。

安装完成后，在对话里用 `/` 菜单或让 Agent 调用 `skill` 工具即可看到这些技能；也可以直接说
"用 emil 的标准 review 一下这段动画"。

验证是否挂上：

```bash
dsh --profile desktop --dump-config | grep -A2 skill-emil
```

---

## 包含的技能（14 个）

| 技能 | 作用 |
| --- | --- |
| `emil-design-eng` | 主技能：UI 打磨、组件设计、动画决策，以及让软件"手感好"的隐形细节 |
| `animate` | 从零做一段动画：按正确顺序决定该不该动、动什么属性、用哪条曲线与时长 |
| `animate-expo` | React Native / Expo 版本：手势、Sheet、触感反馈、屏幕转场，别把动效扔在 JS 线程 |
| `review-animations` | 用严格的标准评审动画代码（默认挑刺，通过是要挣来的） |
| `improve-animations` | 扫描整个代码库的动效，产出按优先级排序、可交给其他 Agent 执行的改造计划 |
| `find-animation-opportunities` | 找出"该动却没动"的地方，同时明确哪些地方不该加动效（只读） |
| `animation-vocabulary` | 反查词典：把"弹出时那个弹一弹的效果"翻译成准确术语（Pop in、Rubber-banding…） |
| `apple-design` | 从 WWDC 设计演讲里提炼、面向 Web 的 Apple 设计原则与流体动效 |
| `mobile-native` | 让 Web 应用在手机上像原生 App：粘滞 hover、点击高亮、100vh bug、输入框缩放…… |
| `break-ui` | 用最坏数据（超长名字、无空格邮箱、超大数字、空列表）压测 UI，并给出每个问题的修法 |
| `prototype` | 同一块 UI 做多个真正不同的版本，用切换器现场对比、挑一个留下 |
| `pick-ui-library` | 从一份有主见的清单里挑前端库：数字输入、OTP、图表、命令面板、虚拟列表、拖拽、Toast…… |
| `ask-sonner` | Sonner（React toast 库）的安装、选型、Promise/Loading toast、主题、定位与常见坑 |
| `write-swift` | 现代 Swift：值类型、Swift 6 并发、泛型、ARC 性能、Swift Testing |

其中 `review-animations`、`prototype`、`pick-ui-library` 上游标记了 `disable-model-invocation: true`，
因此它们**只在被显式调用时运行**，不会自动触发。插件完整保留了这一行为。

把技能目录展开看细节：

```
skills/
├── animate/SKILL.md + RECIPES.md
├── animate-expo/SKILL.md + RECIPES.md
├── ask-sonner/SKILL.md + API.md
├── break-ui/SKILL.md + CATALOG.md
├── improve-animations/SKILL.md + AUDIT.md + PLAN-TEMPLATE.md
├── prototype/SKILL.md + PICKER.md
├── review-animations/SKILL.md + STANDARDS.md
└── …其余为单文件技能
```

`performance-cheatsheet.md` 是上游仓库根目录的速查表，一并保留，供技能与人工查阅。

---

## 它是怎么工作的

```
dsh-emil-skills/
├── package.json          # dsh.bundle.patch 指向 cordis.patch.yml
├── cordis.patch.yml      # 插入一行：id: skill-emil, name: dsh-emil-skills
├── lib/index.js          # Cordis 插件：注册一个 ctx.skills provider
├── skills/               # 上游技能内容（逐字节 vendored）
├── locale/{en,zh}.json   # Plugins 页面里的标题与描述
├── icon.svg              # 插件图标
├── vendor-manifest.json  # 上游 commit + 每个文件的 SHA-256
└── scripts/              # verify.mjs / vendor-manifest.mjs
```

`lib/index.js` 导出标准的 Cordis Host 插件形态（与 DSH 自带的
`@deepseek-ai/dsh-skill-office` 完全同构）：

```js
export const name = 'skill-emil'
export const inject = ['skills']
export function apply(ctx, config = {}) {
  // 挂载时读取并校验 skills/*/SKILL.md，然后在 ctx.skills 上注册 provider
}
```

要点：

- **挂载即校验**：任何一个 `SKILL.md` 的 frontmatter 缺失、名字与目录不符、或名字不符合
  DSH 的 kebab-case 语法，插件会直接报错，而不是等用到时才发现技能不见了。
- **零依赖**：不 import 任何 `@deepseek-ai/*` 包，所以不受 DSH 版本 peer 检查影响，
  也不用 `node_modules`，从 `link:`、GitHub 或 npm 都能直接装。
- **可重定位**：技能目录通过 `import.meta.url` 解析，仓库移到哪里都成立。
- **rank = 600（bundled）**：与 DSH 打包技能同级；项目内 `.dsh/skills`、`~/.dsh/skills`
  里同名的技能仍然优先。

---

## 校验

```bash
npm run verify      # 等价于 node scripts/verify.mjs
```

离线、只读，检查 14 个技能都能被 provider 正常发布与加载、frontmatter 合法、
技能内的相对 Markdown 链接都能解析，并且 vendored 文件的 SHA-256 与
`vendor-manifest.json` 记录一致。

---

## 与上游同步

```bash
git clone --depth 1 https://github.com/emilkowalski/skills.git /tmp/emil-skills
rm -rf skills performance-cheatsheet.md
cp -R /tmp/emil-skills/skills ./skills
cp /tmp/emil-skills/performance-cheatsheet.md ./
node scripts/vendor-manifest.mjs "$(git -C /tmp/emil-skills rev-parse HEAD)"
npm run verify
```

同时更新 `PROVENANCE.md` 里的 commit 记录。

---

## 归属与许可

技能内容版权归 **Emil Kowalski**（MIT，见上游仓库），本仓库只做插件封装并逐字节保留原文。
详见 [`PROVENANCE.md`](PROVENANCE.md) 与 [`LICENSE`](LICENSE)。

上游：<https://github.com/emilkowalski/skills> ·
作者站点：<https://emilkowal.ski/ui/agents-with-taste>

---

<a id="english"></a>

## English

`dsh-emil-skills` packages [Emil Kowalski's skills](https://github.com/emilkowalski/skills) —
a design-engineering skill set for designers and engineers — as a **DeepSeek Harness bundle plugin**.

```bash
# local checkout
dsh plugin --profile desktop add link:/absolute/path/to/dsh-emil-skills
# from GitHub
dsh plugin --profile desktop add github:Inceptzws/dsh-emil-skills
```

The bundle inserts one row (`skill-emil`) whose `apply()` parses every
`skills/*/SKILL.md` at mount time and registers a zero-dependency
`ctx.skills.registerProvider` provider shaped exactly like the shipped
`@deepseek-ai/dsh-skill-office` provider. Skills keep their upstream
`disable-model-invocation` policy, so `review-animations`, `prototype`, and
`pick-ui-library` only run when explicitly invoked.

Contents are vendored byte-for-byte from upstream commit
`e8a175de22ae1e49370fc144c1f3bb9aeedf988d` (MIT). `npm run verify` re-checks every
skill, every relative link, and every recorded SHA-256 offline.

All skill content is © Emil Kowalski (MIT); this repository adds only the plugin
packaging. See [`PROVENANCE.md`](PROVENANCE.md).
