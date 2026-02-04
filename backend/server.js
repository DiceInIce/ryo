const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Вспомогательные функции
function extractKpId(kpId) {
  if (!kpId) return null;
  let cleanId = kpId.toString().replace(/^(ss)?kinopoisk\/?/i, '');
  const match = cleanId.match(/(\d+)/);
  return match ? match[1] : cleanId;
}

/**
 * Получает плеер с flcksbr.xyz
 * @param {string} kpId - ID фильма/сериала
 * @param {string} contentType - 'movie' или 'series'
 * @returns {Promise<Object|null>}
 */
async function getFlcksbrPlayer(kpId, contentType = 'movie') {
  try {
    const urlType = contentType === 'series' ? 'series' : 'film';
    const flcksbrUrl = `https://flcksbr.xyz/${urlType}/${kpId}`;
    
    console.log(`Fetching player from: ${flcksbrUrl}`);
    
    const response = await axios.get(flcksbrUrl, {
      timeout: 30000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.kinopoisk.ru/'
      }
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response data length: ${response.data.length} characters`);
    
    const $ = cheerio.load(response.data);
    
    // Ищем iframe с классом kinobox_iframe (специфичный для flcksbr.xyz)
    let iframe = $('iframe.kinobox_iframe').first();
    console.log(`Found iframe.kinobox_iframe: ${iframe.length}`);
    
    // Если не нашли по классу, ищем любой iframe с src
    if (!iframe.length || !iframe.attr('src')) {
      iframe = $('iframe[src]').first();
      console.log(`Found iframe[src]: ${iframe.length}`);
    }
    
    if (iframe.length && iframe.attr('src')) {
      let iframeUrl = iframe.attr('src');
      console.log(`Raw iframe src: ${iframeUrl}`);
      
      // Декодируем HTML entities
      iframeUrl = iframeUrl.replace(/&amp;/g, '&');
      
      // Делаем URL абсолютным
      if (iframeUrl.startsWith('//')) {
        iframeUrl = 'https:' + iframeUrl;
      } else if (iframeUrl.startsWith('/')) {
        iframeUrl = 'https://flcksbr.xyz' + iframeUrl;
      }
      
      console.log(`Final iframe URL: ${iframeUrl}`);
      
      return {
        iframe: iframeUrl,
        translate: 'Flcksbr',
        warning: false
      };
    }
    
    // Ищем в скриптах (на случай динамической загрузки)
    console.log('Searching in scripts...');
    let foundInScript = false;
    const scripts = $('script');
    console.log(`Total scripts found: ${scripts.length}`);
    
    scripts.each((i, elem) => {
      if (foundInScript) return false;
      
      const scriptContent = $(elem).html() || '';
      
      // Ищем theatre.stloadi.live
      const theatreMatch = scriptContent.match(/["'](https?:\/\/theatre\.stloadi\.live\/[^"']+)["']/);
      if (theatreMatch) {
        const iframeUrl = theatreMatch[1].replace(/&amp;/g, '&');
        console.log(`Found theatre.stloadi.live in script: ${iframeUrl}`);
        foundInScript = {
          iframe: iframeUrl,
          translate: 'Flcksbr',
          warning: false
        };
        return false; // break
      }
      
      // Ищем iframe.src в JavaScript
      const iframeMatch = scriptContent.match(/iframe.*?\.src\s*=\s*["']([^"']+)["']/i);
      if (iframeMatch) {
        let iframeUrl = iframeMatch[1].replace(/&amp;/g, '&');
        if (iframeUrl.startsWith('//')) {
          iframeUrl = 'https:' + iframeUrl;
        } else if (iframeUrl.startsWith('/')) {
          iframeUrl = 'https://flcksbr.xyz' + iframeUrl;
        }
        console.log(`Found iframe.src in script: ${iframeUrl}`);
        foundInScript = {
          iframe: iframeUrl,
          translate: 'Flcksbr',
          warning: false
        };
        return false; // break
      }
      
      // Ищем kinobox_iframe в скриптах
      const kinoboxMatch = scriptContent.match(/kinobox[^"']*["']([^"']+)["']/i);
      if (kinoboxMatch) {
        let iframeUrl = kinoboxMatch[1].replace(/&amp;/g, '&');
        if (iframeUrl.startsWith('//')) {
          iframeUrl = 'https:' + iframeUrl;
        } else if (iframeUrl.startsWith('/')) {
          iframeUrl = 'https://flcksbr.xyz' + iframeUrl;
        }
        console.log(`Found kinobox in script: ${iframeUrl}`);
        foundInScript = {
          iframe: iframeUrl,
          translate: 'Flcksbr',
          warning: false
        };
        return false; // break
      }
    });
    
    if (foundInScript) {
      console.log(`Found iframe in script: ${foundInScript.iframe}`);
      return foundInScript;
    }
    
    // Если ничего не найдено, выводим отладочную информацию
    console.log('No iframe found. Debug info:');
    console.log(`Total iframes on page: ${$('iframe').length}`);
    $('iframe').each((i, elem) => {
      console.log(`Iframe ${i}: class="${$(elem).attr('class')}", src="${$(elem).attr('src')}"`);
    });
    
    return null;
    
  } catch (error) {
    console.error('Error getting Flcksbr player:', error.message);
    if (error.response) {
      console.error(`HTTP ${error.response.status}: ${error.response.statusText}`);
    }
    return null;
  }
}

// Routes

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Получение плееров для фильма/сериала
 * POST /cache
 * Body: { kinopoisk: string, type: string }
 */
app.post('/cache', async (req, res) => {
  try {
    const { kinopoisk, type } = req.body;
    
    console.log('Received request:', { kinopoisk, type });
    
    if (!kinopoisk) {
      console.error('Kinopoisk ID is missing');
      return res.status(400).json({ error: 'Kinopoisk ID is required' });
    }
    
    const kpId = extractKpId(kinopoisk);
    if (!kpId) {
      console.error('Invalid Kinopoisk ID format:', kinopoisk);
      return res.status(400).json({ error: 'Invalid Kinopoisk ID format' });
    }
    
    const contentType = type || 'movie';
    console.log(`Request for KP ID: ${kpId}, type: ${contentType}`);
    
    // Получаем плеер с flcksbr.xyz
    const flcksbr = await getFlcksbrPlayer(kpId, contentType);
    
    console.log('Flcksbr player result:', flcksbr);
    
    const players = {};
    if (flcksbr) {
      players.FLICKSBR = flcksbr;
    }
    
    // Здесь можно добавить другие плееры (Aloha, Kodik и т.д.)
    
    if (Object.keys(players).length === 0) {
      console.error('No players found for KP ID:', kpId);
      return res.status(404).json({ error: 'No players found' });
    }
    
    console.log('Returning players:', players);
    res.json(players);
  } catch (error) {
    console.error('Error in /cache endpoint:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * Получение плееров для аниме (Shikimori)
 * POST /cache_shiki
 * Body: { shikimori: string, type: string }
 */
app.post('/cache_shiki', async (req, res) => {
  try {
    const { shikimori, type } = req.body;
    
    if (!shikimori) {
      return res.status(400).json({ error: 'Shikimori ID is required' });
    }
    
    // Здесь можно добавить логику для Shikimori
    // Пока возвращаем пустой ответ
    res.json({});
  } catch (error) {
    console.error('Error in /cache_shiki endpoint:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📺 Cache endpoint: http://localhost:${PORT}/cache`);
});

module.exports = app;
