export default {
  async fetch(request, env) {
    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // 添加CORS响应头
    const addCorsHeaders = (response) => {
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
      return response;
    };

    const url = new URL(request.url);
    const path = url.pathname;
    
    // 处理保存日志请求
    if (path === '/api/save-log') {
      if (request.method !== 'POST') {
        return addCorsHeaders(new Response('Method not allowed', { status: 405 }));
      }
      
      try {
        const data = await request.json();
        const { content, company, code, type, datetime, price } = data;
        
        if (!content || !company || !code) {
          return addCorsHeaders(new Response('Missing required fields', { status: 400 }));
        }
        
        // 生成文件名
        const timestamp = new Date(datetime).getTime();
        const filename = `${code}/${timestamp}.md`;
        
        // 构建Markdown内容
        const markdownContent = `# ${company} - ${type}
        
日期时间: ${datetime}
股价: ${price || 'N/A'}元

${content}`;
        
        // 上传到R2
        await env.INVESTMENT_LOGS.put(filename, markdownContent);
        
        return addCorsHeaders(new Response(JSON.stringify({
          success: true,
          filename,
          message: '日志保存成功'
        }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      } catch (error) {
        console.error('Save log error:', error);
        return addCorsHeaders(new Response('Internal server error', { status: 500 }));
      }
    }
    
    // 处理获取日志列表请求
    if (path === '/api/get-logs') {
      try {
        const list = await env.INVESTMENT_LOGS.list({ prefix: '' });
        const logs = list.objects.map(obj => ({
          name: obj.key,
          size: obj.size,
          uploaded: obj.uploaded
        }));
        
        return addCorsHeaders(new Response(JSON.stringify({
          success: true,
          logs
        }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      } catch (error) {
        console.error('Get logs error:', error);
        return addCorsHeaders(new Response('Internal server error', { status: 500 }));
      }
    }
    
    // 处理获取单个日志请求
    if (path.startsWith('/api/get-log/')) {
      try {
        const filename = path.replace('/api/get-log/', '');
        const object = await env.INVESTMENT_LOGS.get(filename);
        
        if (!object) {
          return addCorsHeaders(new Response('Log not found', { status: 404 }));
        }
        
        const content = await object.text();
        return addCorsHeaders(new Response(content, {
          headers: { 'Content-Type': 'text/markdown' }
        }));
      } catch (error) {
        console.error('Get log error:', error);
        return addCorsHeaders(new Response('Internal server error', { status: 500 }));
      }
    }
    
    // 处理更新日志请求
    if (path === '/api/update-log') {
      if (request.method !== 'POST') {
        return addCorsHeaders(new Response('Method not allowed', { status: 405 }));
      }
      
      try {
        const data = await request.json();
        const { filename, content, company, code, type, datetime, price } = data;
        
        if (!filename || !content || !company || !code) {
          return addCorsHeaders(new Response('Missing required fields', { status: 400 }));
        }
        
        // 构建Markdown内容
        const markdownContent = `# ${company} - ${type}
        
日期时间: ${datetime}
股价: ${price || 'N/A'}元

${content}`;
        
        // 上传到R2（覆盖原有文件）
        await env.INVESTMENT_LOGS.put(filename, markdownContent);
        
        return addCorsHeaders(new Response(JSON.stringify({
          success: true,
          filename,
          message: '日志更新成功'
        }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      } catch (error) {
        console.error('Update log error:', error);
        return addCorsHeaders(new Response('Internal server error', { status: 500 }));
      }
    }
    
    // 处理删除日志请求
    if (path === '/api/delete-log') {
      if (request.method !== 'POST') {
        return addCorsHeaders(new Response('Method not allowed', { status: 405 }));
      }
      
      try {
        const data = await request.json();
        const { filename } = data;
        
        if (!filename) {
          return addCorsHeaders(new Response('Missing required fields', { status: 400 }));
        }
        
        // 从R2删除文件
        await env.INVESTMENT_LOGS.delete(filename);
        
        return addCorsHeaders(new Response(JSON.stringify({
          success: true,
          message: '日志删除成功'
        }), {
          headers: { 'Content-Type': 'application/json' }
        }));
      } catch (error) {
        console.error('Delete log error:', error);
        return addCorsHeaders(new Response('Internal server error', { status: 500 }));
      }
    }
    
    return addCorsHeaders(new Response('Not found', { status: 404 }));
  }
};