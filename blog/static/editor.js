// 初始化 Quill 富文本编辑器
var quill = new Quill('#editor-container', {
    modules: {
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['blockquote', 'code-block'],
                ['link', 'image']
            ],
            handlers: {
                image: imageHandler
            }
        }
    },
    placeholder: '在这里编写正文...',
    theme: 'snow'
});

// 自定义图片上传逻辑
function imageHandler() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
        const file = input.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            if(!res.ok) throw new Error('上传出错');
            const data = await res.json();
            
            // 获取光标所在位置并插入图片
            const range = quill.getSelection();
            quill.insertEmbed(range.index, 'image', data.url);
        } catch (error) {
            console.error('上传图片时出错:', error);
            alert('图片上传失败，请重试');
        }
    };
}

// 提交表单保存文章
document.getElementById('post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.innerText = '保存中...';

    const id = document.getElementById('post-id').value;
    const title = document.getElementById('title').value;
    const category = document.getElementById('category').value;
    // 获取带有 HTML 标签的完整富文本内容
    const content = quill.root.innerHTML;

    if (!title.trim() || !content.trim()) {
        alert("标题或内容不能为空");
        btn.disabled = false;
        btn.innerText = '保存发布';
        return;
    }

    const payload = { title, category, content };
    // 根据是传参中是否带有 ID 判断是新建还是更新
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/posts/${id}` : '/posts';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            window.location.href = '/admin'; // 成功后返回后台列表
        } else {
            alert('文章保存出现错误');
            btn.disabled = false;
            btn.innerText = '保存发布';
        }
    } catch (err) {
        console.error(err);
        alert('网络请求失败');
        btn.disabled = false;
        btn.innerText = '保存发布';
    }
});
