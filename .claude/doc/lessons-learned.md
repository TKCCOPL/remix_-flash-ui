# 经验教训库

## 类别：布局
<!-- 在此添加布局相关经验 -->

## 类别：API
<!-- 在此添加 API 相关经验 -->

## 类别：测试
- 使用 useI18n() 的组件在测试中必须包裹 PreferencesProvider，否则会抛出 "usePreferences must be used within PreferencesProvider" 错误

## 类别：前端

### 动画闪烁问题
**问题描述**：页面切换时出现白屏闪烁

**根本原因**：
1. 页面组件使用 `initial={{ opacity: 0 }}` 动画，导致页面先以不可见状态渲染
2. CSS 动画（如 `fadeUp`）使用 `opacity: 0` 作为初始状态
3. `AnimatePresence` 配置不当，与 React Router 集成有问题

**解决方案**：
1. 移除所有页面组件的 `initial={{ opacity: 0 }}` 动画，改为 `opacity: 1`
2. 移除 CSS 动画的 `opacity: 0` 初始状态
3. 如果不需要页面切换过渡效果，可以移除 `AnimatePresence`

**经验总结**：
- 在 React Router + Framer Motion 项目中，谨慎使用 `AnimatePresence`
- 如果页面组件已经有自己的动画，不需要在 Layout 或 App 中再添加 `AnimatePresence`
- CSS 动画的初始状态会影响页面切换体验
- 测试页面切换时，要测试从不同页面切换回来的情况

**相关文件**：
- `frontend/pages/*.tsx` - 页面组件动画
- `frontend/index.css` - CSS 动画
- `frontend/App.tsx` - 路由配置

## 类别：后端
<!-- 在此添加后端相关经验 -->
