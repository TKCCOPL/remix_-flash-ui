import sqlite3
import os

DB_FILE = os.path.join(os.path.dirname(__file__), '../data/blog.sqlite3')

articles = [
    {
        "title": "深入理解前端性能优化",
        "content": "## 引言\n前端性能优化是永恒的话题。在2026年，随着Web技术的不断进步，我们需要关注的核心指标也在发生变化。\n\n### Core Web Vitals\n- **LCP** (Largest Contentful Paint): 衡量加载性能。\n- **FID** (First Input Delay): 衡量交互性。\n- **CLS** (Cumulative Layout Shift): 衡量视觉稳定性。\n\n### 优化策略\n1. **图片懒加载**与现代格式(WebP/AVIF)\n2. **代码分割** (Code Splitting)\n3. **服务端渲染** (SSR) 结合边缘计算\n\n通过这些策略，可以显著提升用户体验。",
        "category": "技术",
        "image_url": "https://picsum.photos/seed/tech1/800/400",
        "status": "published"
    },
    {
        "title": "现代网页设计趋势与分析",
        "content": "## 设计的演变\n近年来，网页设计从繁复走向极简，又从极简发展出了独特的“新拟态”和“微交互”风格。\n\n### 2026年关键趋势\n- **深色模式优先**: 不再是可选项，而是必须项。\n- **大排版与沉浸式体验**: 通过夸张的字体和全屏背景吸引用户。\n- **3D元素与微动效**: 增加页面的层次感和生动性。\n\n优秀的UI设计不仅是美观，更是为用户提供流畅的信息架构。",
        "category": "设计",
        "image_url": "https://picsum.photos/seed/design1/800/400",
        "status": "published"
    },
    {
        "title": "程序员的周末：如何保持技术热情",
        "content": "## 技术的疲劳期\n每天面对代码，很容易产生职业倦怠。周末应该如何度过，既能放松身心，又能保持对技术的热爱？\n\n### 我的建议\n1. **放下工作代码**: 去写一些好玩的小工具，而不是继续肝公司的项目。\n2. **阅读非技术书籍**: 扩展视野，灵感往往来自于跨领域的思考。\n3. **户外运动**: 离开电脑桌，去感受自然。\n\n> 保持好奇心，比掌握一门特定的语言更重要。\n\n祝大家都能找到属于自己的平衡。",
        "category": "随笔",
        "image_url": "https://picsum.photos/seed/life1/800/400",
        "status": "published"
    },
    {
        "title": "React与Vue：2026年框架选型指南",
        "content": "## 框架的现状\nReact和Vue依然是前端领域的两大巨头。但随着Svelte和SolidJS的崛起，它们也做出了各自的演进。\n\n### React\n- 优势在于庞大的生态和Server Components的成熟。\n- 适合大型企业级应用。\n\n### Vue\n- Composition API已经成为主流，Vite加持下开发体验极佳。\n- 适合快速迭代和中小型项目。\n\n**总结**：没有最好的框架，只有最适合团队和业务场景的技术栈。",
        "category": "技术",
        "image_url": "https://picsum.photos/seed/tech2/800/400",
        "status": "published"
    },
    {
        "title": "极简主义在UI/UX设计中的应用",
        "content": "## 少即是多\n极简主义不代表简陋，而是去除一切多余的装饰，让用户的注意力集中在核心内容上。\n\n### 实践原则\n- **留白**: 大胆使用空白区域，让呼吸感成为设计的语言。\n- **色彩克制**: 限制主色调的数量，用对比色引导视线。\n- **清晰的层级**: 通过坚实的排版、字体大小、粗细和颜色建立视觉层次。\n\n好的设计应该是隐形的，让用户在不知不觉中完成目标。",
        "category": "设计",
        "image_url": "https://picsum.photos/seed/design2/800/400",
        "status": "published"
    }
]

def insert_articles():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Ensure categories exist
    categories = set(a['category'] for a in articles)
    for cat in categories:
        cursor.execute("INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)", (cat, cat))
    
    for article in articles:
        cursor.execute('''
            INSERT INTO posts (title, content, category, image_url, status)
            VALUES (?, ?, ?, ?, ?)
        ''', (article['title'], article['content'], article['category'], article['image_url'], article['status']))
    
    conn.commit()
    conn.close()
    print(f"Successfully inserted {len(articles)} test articles.")

if __name__ == '__main__':
    insert_articles()
